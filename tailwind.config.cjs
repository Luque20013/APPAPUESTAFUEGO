const rv = (n) => `rgb(var(--${n}) / <alpha-value>)`;
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: { 50: rv('s50'), 100: rv('s100'), 200: rv('s200'), 300: rv('s300'), 400: rv('s400'), 500: rv('s500'), 600: rv('s600'), 700: rv('s700'), 800: rv('s800'), 900: rv('s900'), 950: rv('s950') },
        amber: { 300: rv('am300'), 400: rv('am400'), 500: rv('am500'), 600: rv('am600') },
        orange: { 500: rv('fire') },
        emerald: { 300: rv('em300'), 400: rv('em400'), 500: rv('em500'), 600: rv('em600') },
        rose: { 300: rv('ro300'), 400: rv('ro400'), 500: rv('ro500'), 600: rv('ro600') },
        blue: { 200: rv('bl200'), 400: rv('bl400'), 500: rv('bl500'), 600: rv('bl600') },
        cyan: { 400: rv('cy400'), 500: rv('cy500') },
        purple: { 400: rv('pu400'), 500: rv('pu500') }
      }
    }
  }
}
