import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.main}>
        <h1>AI Code Review Platform Docs</h1>
        <p>
          Documentation for the AI Code Review Platform, including repository
          integrations, pull request analysis, sandbox execution, and team
          workflows.
        </p>
        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://github.com/karanpraja902/ai-code-review-platform"
            target="_blank"
            rel="noopener noreferrer"
          >
            Repository
          </a>
          <a className={styles.secondary} href="mailto:karanpraja902@gmail.com">
            Contact
          </a>
        </div>
      </section>
    </main>
  );
}
