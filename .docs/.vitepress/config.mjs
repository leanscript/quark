import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "quark",
  description: "quark documentation",
  base: '/quark/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/examples' }
    ],

    sidebar: [
      {
        text: 'Quickstart',
        items: [
          { text: 'Requirements', link: '/requirements' },
          { text: 'Installation', link: '/installation' },
        ]
      },
      {
        text: 'First steps',
        items: [
          { text: 'Your first controller', link: '/your-first-controller' },
        ]
      },
      {
        text: 'Customizing your controller',
        items: [
          { text: 'Decorators', link: '/your-first-controller' },
          { text: 'Interceptors', link: '/your-first-controller' },
          { text: 'Pipes', link: '/your-first-controller' },
        ]
      },
      {
        text: 'Available database plugins',
        items: [
          { text: 'Mongodb', link: '/mongodb' },
          { text: 'Sequelize', link: '/sequelize' },
        ]
      },
      {
        text: 'Available Searchengine plugins',
        items: [
          { text: 'Meilisearch', link: '/meilisearch' },
          { text: 'Typesense', link: '/typesense' },
        ]
      },
      {
        text: 'API reference', link: '/api-reference'
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/leanscript/supernova' }
    ]
  }
})
