import casparBasic from "./caspar-basic.mjs";
import casparBasicWebgl from "./caspar-basic-webgl.mjs";

const plugins = [casparBasic, casparBasicWebgl];

export const listPlugins = () =>
  plugins.map(({ key, name, kind, description }) => ({ key, name, kind, description }));

export const getPlugin = (key = "caspar-basic") =>
  plugins.find((p) => p.key === key) || casparBasic;

