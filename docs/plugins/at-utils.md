# Utilities (at-utils)

The `at-utils` package is a bundle of utilities which aim to make application install and maintenance easier. 

{{{TABLE_OF_CONTENTS}}}

## Running commands

All of the commands listed below are run using **npx**, which is a task runner utility which comes bundled with **npm**.

```bash
npx adapt-security/utils [COMMAND] [...OPTIONS] [ARGUMENTS]
```
> #### Arguments, options and flags - oh my! :astonished:
> There's a lot of terminology here which is confusing to anyone new to running commands in a command-line interface (CLI). If we look at the following as an example:
> ```bash
> npx adapt-security/at-utils install --no-ui --prerelease /home/user/adapt
> ```
> The 'command' element is the 'task' being run, and is first bit after `npx adapt-security/at-utils`, or in our case, `install`.
> 
> Anything that comes after the command is either an argument or an option; an argument is a mandatory value which the task requires to run, and an option is an optional value which usually modifies the task's behaviour in some way (options are noticable as being prefixed with `-` or `--`, and are also often referred to as 'flags').
>
> Looking at the above example again, `--no-ui` and `--prerelease` are both options, and `/home/user/adapt` is the only argument.

Below is a full reference of the commands available as part of **at-utils**.

***

{{{CONTENTS}}}