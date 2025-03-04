[Turbo config docs](https://turbo.build/repo/docs/reference/configuration)

-   `transitNode` ([Transit Nodes](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#transit-nodes)) - a task that does not do anything but is used to specify the order of execution of other tasks. All tasks that depend on this task will be executed in parallel but with respect to the package dependencies. [More...](https://turbo.build/repo/docs/crafting-your-repository/configuring-tasks#dependent-tasks-that-can-be-ran-in-parallel)

-   `dependsOn` - specifies the tasks that must be executed before this task
    `^` - means that the task must be executed in dependency order
    without the `^` - the task will be executed after the task in the same package
    `packageName#taskName` - the task from another package

-   `outputs` - specifies the files and directories that the task generates and that should be cached
    `!` - means that the file or directory should be excluded from the list

-   `inputs` - specifies the files and directories that the task depends on.
    By default, Turborepo will include all files in the package that are tracked by Git
    (for example `"inputs": ["**/*.md", "**/*.mdx"]` or `"inputs": ["$TURBO_DEFAULT$", "!README.md"]` to exclude `README.md`)

-   `cache` - specifies whether the task should be cached. By default, all tasks are cached

TODO:

1. Set correct `outputs` for `compile` task for each package
2. Setup the remote cache
3. Use turbo with remote cache on CI
