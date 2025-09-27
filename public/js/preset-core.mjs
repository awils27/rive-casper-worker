// Builds Caspar preset XML. No <devicename>.
export function buildPresetXml({ label, name, layer = 20, sendAsJson = true, componentData = [] }) {
  const sendJsonStr = sendAsJson ? 'true' : 'false';
  const rows = componentData.map(({ id, value }) => `        <componentdata>
          <id>${xml(id)}</id>
          <value>${xml(value)}</value>
        </componentdata>`).join('\n');

  const templatedata = rows
    ? `\n      <templatedata>\n${rows}\n      </templatedata>`
    : `\n      <templatedata />`;

  return `<?xml version="1.0"?>
<items>
  <item>
    <type>TEMPLATE</type>
    <label>${xml(label)}</label>
    <name>${xml(name ?? label)}</name>
    <flashlayer>${Number(layer) || 20}</flashlayer>
    <invoke></invoke>
    <usestoreddata>false</usestoreddata>
    <useuppercasedata>false</useuppercasedata>
    <triggeronnext>false</triggeronnext>
    <sendasjson>${sendJsonStr}</sendasjson>${templatedata}
    <color>Transparent</color>
  </item>
</items>
`;
}

export function xml(s) {
  return String(s ?? '').replace(/[&<>'"]/g, ch => (
    {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&apos;','"':'&quot;'}[ch]
  ));
}
