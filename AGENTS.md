# Agent Reference

GoatCode includes 7 specialized agents. Each agent is tuned for specific tasks and has unique capabilities and tool restrictions.

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

## Worker

A general purpose executor for standard tasks and category-based delegation.

- **When to use**: For standard tasks that don't require a specific specialist.
- **Key Capabilities**: General code editing, file management, and tool usage.
- **Example Prompt**: "Update the version number in package.json and run the build script."
