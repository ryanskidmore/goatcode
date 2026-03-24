# Agent Reference

GoatCode includes 11 specialized agents. Each agent is tuned for specific tasks and has unique capabilities and tool restrictions.

## Orchestrator

The main coordinator for all tasks. It analyzes user intent, builds a plan, and delegates work to specialists.

- **When to use**: For any new task or complex multi-step project.
- **Key Capabilities**: Intent analysis, task delegation, parallel execution management, and final verification.
- **Example Prompt**: "Analyze the user's request and break it down into atomic tasks for specialist agents."

## DeepWorker

An autonomous worker designed for end-to-end execution of complex technical goals.

- **When to use**: When you have a clear goal but the implementation steps are unknown or complex.
- **Key Capabilities**: Codebase exploration, research, and implementation without constant supervision.
- **Example Prompt**: "Implement the new authentication flow including database migrations and API endpoints."

## PlanBuilder

A strategic planner that uses an interview mode to define project scope and requirements.

- **When to use**: Before starting a large feature or refactor to ensure all requirements are clear.
- **Key Capabilities**: Requirement gathering, ambiguity identification, and detailed plan generation.
- **Example Prompt**: "Interview the user to understand the requirements for the new plugin system."

## Advisor

A read-only consultant for architecture, code review, and debugging advice.

- **When to use**: When you need a second opinion on a design or help debugging a complex issue.
- **Key Capabilities**: Architecture analysis, code review, and debugging strategy.
- **Example Prompt**: "Review this architectural proposal for potential security vulnerabilities."

## Researcher

Specializes in searching external documentation and internal codebases.

- **When to use**: When you need to find how to use a specific library or find existing patterns in the code.
- **Key Capabilities**: Documentation search, code pattern identification, and classification.
- **Example Prompt**: "Find the best practices for implementing JWT authentication in a Bun environment."

## Explorer

A fast agent for codebase search and pattern matching using grep and glob tools.

- **When to use**: For quick searches across the entire project.
- **Key Capabilities**: Fast pattern matching, file discovery, and parallel tool execution.
- **Example Prompt**: "Find all occurrences of the 'PluginRegistry' class and its usages."

## Executor

A task-oriented worker that follows a specific plan or todo list.

- **When to use**: For executing well-defined steps in a larger plan.
- **Key Capabilities**: Sequential task execution, status tracking, and atomic commits.
- **Example Prompt**: "Execute the next three steps in the migration plan."

## Analyst

Performs pre-planning gap analysis and reviews proposals for completeness.

- **When to use**: To verify a plan before execution starts.
- **Key Capabilities**: Gap analysis, edge case identification, and requirement verification.
- **Example Prompt**: "Analyze this implementation plan for missing edge cases or potential performance bottlenecks."

## Reviewer

Verifies code changes and plans against the original requirements.

- **When to use**: For final verification of a completed task or PR.
- **Key Capabilities**: Requirement matching, code quality verification, and reference checking.
- **Example Prompt**: "Verify that the implemented changes meet all the requirements specified in the original task."

## Inspector

A multimodal agent for analyzing images, diagrams, and PDFs.

- **When to use**: When you need to extract information from non-text files.
- **Key Capabilities**: Image analysis, PDF text extraction, and diagram interpretation.
- **Example Prompt**: "Analyze this UI mockup and describe the layout and components."

## Worker

A general purpose executor for standard tasks and category-based delegation.

- **When to use**: For standard tasks that don't require a specific specialist.
- **Key Capabilities**: General code editing, file management, and tool usage.
- **Example Prompt**: "Update the version number in package.json and run the build script."
