import { NextFunction, Request, Response } from 'express';
import CustomContext, { ICustomContext, DEFAULT_REVIEW_PROMPTS } from '../models/custom_context.model.js';

export const getCustomContexts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const query = (req.query.query as string) || '';
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      createdBy: userId,
      team: teamId || userId,
    };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { customPrompt: { $regex: query, $options: 'i' } },
      ];
    }

    const [contexts, total] = await Promise.all([
      CustomContext.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CustomContext.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      data: contexts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomContextById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const context = await CustomContext.findOne({ _id: id, createdBy: userId });

    if (!context) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    res.status(200).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const createCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const {
      name,
      customPrompt,
      repositories,
      styleReviews,
      securityReviews,
      performanceReviews,
      codeQualityReviews,
      documentationReviews,
      testingReviews,
      accessibilityReviews,
      bestPracticesReviews,
      isActive,
      isDefault,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    const contextData: Partial<ICustomContext> = {
      name: name.trim(),
      createdBy: userId,
      team: teamId || userId,
      customPrompt: customPrompt || '',
      repositories: repositories || [],
      styleReviews: styleReviews || {
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.styleReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.styleReviews.prompt,
      },
      securityReviews: securityReviews || {
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.securityReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.securityReviews.prompt,
      },
      performanceReviews: performanceReviews || {
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.performanceReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.performanceReviews.prompt,
      },
      codeQualityReviews: codeQualityReviews || {
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.codeQualityReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.codeQualityReviews.prompt,
      },
      documentationReviews: documentationReviews || {
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.documentationReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.documentationReviews.prompt,
      },
      testingReviews: testingReviews || {
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.testingReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.testingReviews.prompt,
      },
      accessibilityReviews: accessibilityReviews || {
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.accessibilityReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.accessibilityReviews.prompt,
      },
      bestPracticesReviews: bestPracticesReviews || {
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.bestPracticesReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.bestPracticesReviews.prompt,
      },
      isActive: isActive ?? true,
      isDefault: isDefault ?? false,
    };

    if (isDefault) {
      await CustomContext.updateMany(
        { team: teamId || userId, isDefault: true },
        { isDefault: false }
      );
    }

    const context = await CustomContext.create(contextData);

    res.status(201).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const updateCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const existingContext = await CustomContext.findOne({ _id: id, createdBy: userId });

    if (!existingContext) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    const {
      name,
      customPrompt,
      repositories,
      styleReviews,
      securityReviews,
      performanceReviews,
      codeQualityReviews,
      documentationReviews,
      testingReviews,
      accessibilityReviews,
      bestPracticesReviews,
      isActive,
      isDefault,
    } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ status: 'error', message: 'Name cannot be empty' });
    }

    if (isDefault && !existingContext.isDefault) {
      await CustomContext.updateMany(
        { team: teamId || userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    const updateData: Partial<ICustomContext> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (customPrompt !== undefined) updateData.customPrompt = customPrompt;
    if (repositories !== undefined) updateData.repositories = repositories;
    if (styleReviews !== undefined) updateData.styleReviews = styleReviews;
    if (securityReviews !== undefined) updateData.securityReviews = securityReviews;
    if (performanceReviews !== undefined) updateData.performanceReviews = performanceReviews;
    if (codeQualityReviews !== undefined) updateData.codeQualityReviews = codeQualityReviews;
    if (documentationReviews !== undefined) updateData.documentationReviews = documentationReviews;
    if (testingReviews !== undefined) updateData.testingReviews = testingReviews;
    if (accessibilityReviews !== undefined) updateData.accessibilityReviews = accessibilityReviews;
    if (bestPracticesReviews !== undefined) updateData.bestPracticesReviews = bestPracticesReviews;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const context = await CustomContext.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const patchCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const existingContext = await CustomContext.findOne({ _id: id, createdBy: userId });

    if (!existingContext) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    const { isActive, isDefault } = req.body;

    if (isDefault && !existingContext.isDefault) {
      await CustomContext.updateMany(
        { team: teamId || userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    const updateData: Partial<ICustomContext> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const context = await CustomContext.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const context = await CustomContext.findOneAndDelete({ _id: id, createdBy: userId });

    if (!context) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    res.status(200).json({ status: 'success', message: 'Custom context deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getDefaultPrompts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ status: 'success', data: DEFAULT_REVIEW_PROMPTS });
  } catch (error) {
    next(error);
  }
};
