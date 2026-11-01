// index.html 안의 정적 데이터(NEWSLETTERS_DATA, ONMAUM_HEARTS)를 꺼내는 공용 함수
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
export function extractStatic(file = new URL('../index.html', import.meta.url)) {
  const html = readFileSync(file, 'utf8');
  const nl = html.match(/\/\*NEWSLETTERS_DATA_START\*\/([\s\S]*?)\/\*NEWSLETTERS_DATA_END\*\//)[1];
  const ht = html.match(/\/\*HEARTS_DATA_START\*\/([\s\S]*?)\/\*HEARTS_DATA_END\*\//)[1];
  const ctx = {};
  vm.runInNewContext(nl.replace('const NEWSLETTERS_DATA', 'this.NEWSLETTERS_DATA') + ht.replace('const ONMAUM_HEARTS', 'this.ONMAUM_HEARTS'), ctx);
  return { issues: ctx.NEWSLETTERS_DATA, hearts: ctx.ONMAUM_HEARTS };
}
