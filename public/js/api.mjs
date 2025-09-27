export async function generateTemplate(payload){
  const res = await fetch('/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status} ${res.statusText}`);
  return res;
}
