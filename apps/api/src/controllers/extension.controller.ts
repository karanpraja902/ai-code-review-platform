import { Request, Response } from 'express';
import ExtensionData from '../models/extension.data.model.js';
import { executeAnalysis } from '../services/sandbox/executeAnalysis.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { createParserState, parseStreamingResponse, finalizeParsing, PRComment } from '../utils/responseParser.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const createExtensionReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { repository, branches, changes, feedback } = req.body;

      if (!repository || !branches || !changes) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      const extensionData = new ExtensionData({
        repository,
        branches,
        changes,
        feedback,
      });

      await extensionData.save();

      // Find repository by fullName
      const githubRepo = await Github_Repository.findOne({ fullName: repository.fullName });
      const githubRepoId = githubRepo ? githubRepo._id.toString() : null;

      // Execute Analysis
      const prompt = `Analyze this code changes for security vulnerabilities, code quality issues, and potential bugs. Provide inline comments and suggestions.`;
      const parserState = createParserState();
      const comments: PRComment[] = [];

      const callbacks = {
        onStdout: async (data: string) => {
          logger.debug("Extension analysis stdout", { data });
          
          const { prComments, state } = parseStreamingResponse(data, parserState);
          Object.assign(parserState, state);
          if (prComments.length > 0) {
            comments.push(...prComments);
          }
        },
        onStderr: async (data: string) => {
          console.error('Analysis stderr:', data);
          const { prComments, state } = parseStreamingResponse(data, parserState);
          Object.assign(parserState, state);
          if (prComments.length > 0) {
            comments.push(...prComments);
          }
        },
        onProgress: async (message: string) => {
          // console.log('Analysis progress:', message);
        }
      };

      // Use authenticated user ID if available, otherwise use a default or fail
      // The middleware should populate req.user
      // @ts-ignore
      const userId = req.user?._id?.toString();
      
      if (!userId) {
         // This should be handled by auth middleware, but just in case
         res.status(401).json({ message: 'Unauthorized' });
         return;
      }

      // We need a dummy analysis ID for the executeAnalysis function if we want to track it separately?
      // actually executeAnalysis generates one if not provided, but we might want to link it?
      // For now let executeAnalysis handle it.

      await executeAnalysis(
        githubRepoId, // githubRepoId (can be null)
        repository.url, // repoUrl
        branches.head.ref, // branch
        userId, // userId
        prompt,
        "extension_analysis", // analysisType
        callbacks,
        {
          extension_data_id: extensionData._id,
          repo_url: repository.url,
        },
        // @ts-ignore
        req.user?.email
      );

      // Finalize parsing
      const finalComments = finalizeParsing(parserState);
      if (finalComments.length > 0) {
        comments.push(...finalComments);
      }

      res.status(201).json({
        message: 'Review completed',
        data: extensionData,
        comments
      });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Internal server error', error });
    }
  };

