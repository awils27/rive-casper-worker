// src/templates/registry.mjs
import casparBasic from "./caspar-basic.mjs";
import casparLowerThird from "./caspar-lowerthird.mjs";
import casparBundle from "./caspar-bundle.mjs";

const plugins = [casparBasic, casparLowerThird, casparBundle];

export const registry = () => plugins;
export const getPlugin = (key) => plugins.find(p => p.key === key);
