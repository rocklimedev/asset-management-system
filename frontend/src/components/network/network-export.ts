/** A single image page PDF; binary streams and cross-reference offsets use bytes. */
export function networkImagePdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)))
    throw new Error('Invalid network image dimensions.');
  const pageW = width >= height ? 1190.55 : 841.89;
  const pageH = width >= height ? 841.89 : 1190.55;
  const scale = Math.min((pageW - 48) / width, (pageH - 48) / height);
  const w = width * scale, h = height * scale;
  const command = `q ${w} 0 0 ${h} ${(pageW - w) / 2} ${(pageH - h) / 2} cm /Network Do Q\n`;
  const encoder = new TextEncoder(), chunks: Uint8Array[] = [], offsets = [0];
  let length = 0;
  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes); length += bytes.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = length; append(`${id} 0 obj\n${body}\nendobj\n`);
  };
  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Network 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg); append('\nendstream\nendobj\n');
  object(5, `<< /Length ${encoder.encode(command).length} >>\nstream\n${command}endstream`);
  const xref = length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const output = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) { output.set(chunk, position); position += chunk.length; }
  return output;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** Export the full drawing, independent of pan/zoom, with current line visibility. */
export async function downloadNetwork(svg: SVGSVGElement, format: 'png' | 'pdf') {
  await document.fonts.ready;
  const content = svg.querySelector<SVGGElement>('[data-network-content]');
  if (!content) throw new Error('Network drawing is unavailable.');
  const box = content.getBBox(), padding = 32;
  const width = Math.max(200, box.width + padding * 2), height = Math.max(150, box.height + padding * 2);
  const scale = Math.min(2, 8192 / Math.max(width, height), Math.sqrt(24000000 / (width * height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is unavailable in this browser.');
  const clone = content.cloneNode(true) as SVGGElement;
  const originals = [content, ...content.querySelectorAll<SVGElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<SVGElement>('*')];
  const properties = ['fill', 'stroke', 'color', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width', 'stroke-dasharray', 'font-size', 'font-weight', 'text-anchor', 'paint-order', 'display', 'visibility'];
  originals.forEach((element, i) => {
    const style = getComputedStyle(element);
    for (const property of properties) copies[i].style.setProperty(property, style.getPropertyValue(property));
    copies[i].style.fontFamily = 'Arial, sans-serif';
  });
  clone.querySelectorAll('[data-export-ignore]').forEach((element) => element.remove());
  const output = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  output.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  output.setAttribute('width', String(canvas.width)); output.setAttribute('height', String(canvas.height));
  output.setAttribute('viewBox', `${box.x - padding} ${box.y - padding} ${width} ${height}`);
  output.append(clone);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(output)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not render the network image.')); image.src = url;
    });
    const background = getComputedStyle(svg).getPropertyValue('--background').trim();
    context.fillStyle = background ? `hsl(${background})` : '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    if (format === 'png') {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode PNG.')), 'image/png'));
      download(blob, 'office-network.png');
    } else {
      const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.95).split(',')[1]), (c) => c.charCodeAt(0));
      const pdf = networkImagePdf(jpeg, canvas.width, canvas.height);
      download(new Blob([pdf as BlobPart], { type: 'application/pdf' }), 'office-network.pdf');
    }
  } finally { URL.revokeObjectURL(url); }
}
