export const listTemplates = async () => {
  const r = await fetch("/templates");
  return await r.json();
};

export const generate = (payload) => {
  return fetch("/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
