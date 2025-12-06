import postcssUtopia from 'postcss-utopia';

export default {
  plugins: [
    postcssUtopia({
      minWidth: 320,
      maxWidth: 1240,
    }),
  ],
};
