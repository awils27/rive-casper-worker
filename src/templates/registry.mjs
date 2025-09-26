import casparBasic from "./caspar-basic.mjs";

const plugins = [casparBasic];

export const listPlugins = () =>
  plugins.map(({ key, name, kind, description }) => ({ key, name, kind, description }));

export const getPlugin = (key = "caspar-basic") =>
  plugins.find((p) => p.key === key) || casparBasic;
