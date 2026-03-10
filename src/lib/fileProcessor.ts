import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function processFile(file: File): Promise<void> {
  const zip = new JSZip();

  const content = await file.arrayBuffer();
  const zipContent = await zip.loadAsync(content);

  let modified = false;

  if (zipContent.files['armor_stand.entity.json']) {
    const armorStandFile = await zipContent.files['armor_stand.entity.json'].async('string');
    let updatedContent = armorStandFile;

    updatedContent = updatedContent.replace(
      /"default"\s*:\s*"armor_stand"/g,
      '"default":"leash_knot"'
    );

    updatedContent = updatedContent.replace(
      /"identifier"\s*:\s*"minecraft:armor_stand"/g,
      '"identifier":"minecraft:leash_knot"'
    );

    zipContent.file('armor_stand.entity.json', updatedContent);
    modified = true;
  }

  if (zipContent.files['manifest.json']) {
    const manifestFile = await zipContent.files['manifest.json'].async('string');
    let updatedManifest = manifestFile;

    updatedManifest = updatedManifest.replace(
      /"name"\s*:\s*"Kelp Farm \(1\)"/g,
      '"name":"Kelp Farm (1)§4§l)fixed)"'
    );

    zipContent.file('manifest.json', updatedManifest);
    modified = true;
  }

  if (zipContent.files['pack_icon.png']) {
    zipContent.remove('pack_icon.png');
  }

  const newIcon = await generateFixIcon();
  zipContent.file('pack_icon.png', newIcon);
  modified = true;

  const blob = await zipContent.generateAsync({ type: 'blob' });

  const originalName = file.name.replace(/\.(mcpack|zip)$/i, '');
  const newFileName = `${originalName}_fixed.mcpack`;

  saveAs(blob, newFileName);
}

async function generateFixIcon(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const gradient = ctx.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, '#1e3a8a');
  gradient.addColorStop(1, '#3b82f6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIX', 64, 64);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
}
