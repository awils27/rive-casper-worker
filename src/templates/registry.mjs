import casparBasic from "./caspar-basic.mjs";
// add more plugins here

const plugins = [casparBasic];
export const registry  = () => plugins;
export const getPlugin = (key) => plugins.find(p => p.key === key);
