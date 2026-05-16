# Component tests

Vue component tests use `@vue/test-utils` with the jsdom environment. Cover the four observable surfaces of a component: render, emits, props, slots.

## What to cover

- **Render** — given valid props, the component mounts and renders the expected DOM. Assert key elements (a button, a chart container, a row count for tables).
- **Emits** — user interactions emit the right event with the right payload. Always assert both the event name and the payload shape.
- **Props** — passing different props changes the rendered output as documented. Edge cases: empty arrays, very large arrays, undefined optional props.
- **Slots** — if the component exposes slots, mount with a slot and confirm the slot content renders in the right slot.

## Mount pattern

```ts
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import Component from '@/components/Component.vue'

const i18n = createI18n({ legacy: false, locale: 'en-US', messages: { 'en-US': { ... } } })

const buildWrapper = (props = {}) =>
  mount(Component, {
    props,
    global: { plugins: [i18n] },
  })

it("renders the title from props", () => {
  const wrapper = buildWrapper({ title: 'Hello' })
  expect(wrapper.text()).toContain('Hello')
})
```

Use a small factory (`buildWrapper`) when several tests share the same setup — keeps individual tests focused on the assertion.

## Emits

```ts
it("emits 'update' with the new value when the input changes", async () => {
  const wrapper = buildWrapper({ modelValue: 'old' })
  await wrapper.find('input').setValue('new')
  expect(wrapper.emitted('update')).toBeTruthy()
  expect(wrapper.emitted('update')![0]).toEqual(['new'])
})
```

`await` the user interaction — Vue updates the DOM asynchronously, and the assertion will fail intermittently without the await.

## i18n

Components that use `useI18n` need an `i18n` plugin in `global.plugins`, even if the test doesn't care about translation. Create a minimal stub once per spec — see the mount pattern above.

If the test only cares about keys, not translations, return the key from the stub:

```ts
const stubI18n = { install: (app) => { app.config.globalProperties.$t = (k: string) => k } }
```

## When to skip a component test

Pure presentational components (a logo, a static layout shell) don't need tests — there's nothing observable to assert beyond "it didn't throw on mount". Reserve component tests for components with behavior: forms, charts, tables, interactive controls.
