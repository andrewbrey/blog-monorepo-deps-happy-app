# Happy App Monorepo

> **Notice** — To see the issue solved by _this_ repository in action, see
> [the companion repository for the "Sad App Monorepo"](https://github.com/andrewbrey/blog-monorepo-deps-sad-app).

This repository is a monorepo which contains 2 workspaces, one a `React` UI
library and the other a `React` App which _consumes_ the UI library. It serves
as a demo of my preferred method for ensuring that workspaces in a monorepo
can't declare incompatible dependencies, so I have assurance that when the App
imports the `Button` component from the UI library, it's not going to explode at
runtime.

You may notice that the `package.json` for each child workspace looks a little
funny, in particular that each:

- declares no `dependencies` nor `devDependencies` (save those which come from a
  sibling workspace)
- has a `shadow` key under which they _do declare_ the **names** of their 3rd
  party dependencies

By moving the declaration of _all_ "concrete" dependencies (i.e. 3rd party
dependencies along with the particular version of each) into the monorepo root,
I ensure that each child workspace will resolve _exactly the same version_ of
any given dependency they share. This makes it impossible for the UI library and
the App to use different versions of `React` and thus, each depends on
`react@^18`, which is why this is the **Happy App Monorepo**

There are definitely tradeoffs to solving the "potential for incompatible
dependencies" problem in this way, but these tradeoffs are the ones that I've
found make the most sense for my own projects.

> This repository exists as a supporting demo for my blog post
> "[Your Monorepo Dependencies Are Asking for Trouble](https://blog.andrewbrey.com/2022-10-12-your-monorepo-dependencies-are-asking-for-trouble/)"
> on the topic of managing dependencies in monorepos. In the blog post, you will
> find a more thorough discussion of the issue as well as discussion of the
> tradeoffs involved with solving the issue in this way.
