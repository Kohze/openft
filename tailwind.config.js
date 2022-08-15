const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  important: true,
  theme: {
    extend: {
      fontFamily: {
        base: ['Inter', 'sans-serif'],
      },
      screens: {
        xs: '475px',
        '2xlg': '1200px',
        '3xlg': '1364px',
      },
      backgroundImage: {
        'checkbox-icon':
          'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDNMNC41IDguNUwyIDYiIHN0cm9rZT0iIzE1NUVFRiIgc3Ryb2tlLXdpZHRoPSIxLjY2NjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KCg==")',
        'registration-bg': 'url("/images/register-bg.webp")',
      },
    },
  },
  corePlugins: {
    // aspectRatio: false,
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    plugin(function ({ addUtilities, addComponents }) {
      const utilities = {
        '.border-gray-gradient': {
          borderImage:
            'linear-gradient(to bottom, #3F4C71, rgba(255,255,255, 0)) 1 stretch',
        },
      }

      addUtilities(utilities)
    }),
  ],
}
