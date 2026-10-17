# Use Emil skills for demo motion

Weekend UI and motion work on a sticky demo runs three skills in order.

1. Run `/find-animation-opportunities` on the demo. It names motion worth adding and skips the rest.
2. Run `/animate` to build that motion.
3. Run `/review-animations` on the result.

## Optional checks

- Run `/break-ui` to feed the screen worst-case data.
- Run `/mobile-native` when the demo is used on a phone.
- Run `/prototype` to build several versions of one piece and pick one.

`emil-design-eng` is the design-engineering skill the others assume. Run `/pick-ui-library` only when you ask which library to use.

The skill files are in `.agents/skills/`. `skills-lock.json` records the install. This repo does not include `write-swift`, `animate-expo`, or `ask-sonner`.
