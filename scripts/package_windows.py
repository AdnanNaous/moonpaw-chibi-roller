"""Package the built Windows folder without the unsigned portable wrapper."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
source = root / 'release/win-unpacked'
if not (source / 'MOONPAW Ashen Vow.exe').is_file():
    raise SystemExit('Build the Windows folder first: pnpm desktop:pack')
target = root / f'release/MOONPAW-Ashen-Vow-{version}-Windows.zip'
with ZipFile(target, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
    for item in source.rglob('*'):
        if item.is_file():
            archive.write(item, Path('MOONPAW Ashen Vow') / item.relative_to(source))
print(target)
