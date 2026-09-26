(() => {
  'use strict';

  const presets = {
    valid: '46 52 4D 31 00 03 41 42 43',
    short: '46 52 4D 31 00',
    magic: '46 52 4D 32 00 03 41 42 43',
    length: '46 52 4D 31 00 05 41 42 43'
  };
  const input = document.getElementById('hex-input');
  const tabs = [...document.querySelectorAll('.evidence-tab')];
  const presetButtons = [...document.querySelectorAll('[data-preset]')];
  let current = null;
  let stage = 'binary';

  function parseBytes(value) {
    const compact = value.replace(/[\s,]+/g, '');
    if (!/^[0-9a-f]*$/i.test(compact) || compact.length % 2 !== 0) {
      throw new Error('请只输入成对的十六进制字符，例如 46 52 4D 31。');
    }
    return compact.match(/.{2}/g)?.map(pair => Number.parseInt(pair, 16)) ?? [];
  }

  function hex(bytes) {
    return bytes.length ? bytes.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ') : '—';
  }

  function printable(bytes) {
    return bytes.map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·').join('') || '—';
  }

  function inspect(bytes) {
    const size = bytes.length;
    const magic = bytes.slice(0, 4);
    const payload = bytes.slice(6);
    const declared = size >= 6 ? (bytes[4] << 8) | bytes[5] : null;
    const headerOK = size >= 6;
    const magicOK = headerOK && magic.every((byte, index) => byte === [0x46, 0x52, 0x4D, 0x31][index]);
    const lengthOK = magicOK && declared <= size - 6;
    const outcome = !headerOK ? 'short' : !magicOK ? 'magic' : !lengthOK ? 'length' : 'valid';
    return { bytes, size, magic, payload, declared, headerOK, magicOK, lengthOK, outcome };
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function renderBytes(result) {
    setText('byte-magic', hex(result.magic));
    setText('ascii-magic', printable(result.magic));
    setText('byte-length', result.size >= 6 ? hex(result.bytes.slice(4, 6)) : '—');
    setText('decimal-length', result.declared === null ? '头部不完整' : `声明 ${result.declared} B`);
    setText('byte-payload', hex(result.payload));
    setText('payload-length', `实际 ${result.payload.length} B`);
  }

  function renderTrace(result) {
    const checks = [
      { title: '确认输入与最短头部', description: `${result.size} B 输入；至少需要 6 B`, state: result.headerOK ? 'pass' : 'fail' },
      { title: '比对 FRM1 标识', description: `当前前 4 字节：${printable(result.magic)}`, state: !result.headerOK ? 'skip' : result.magicOK ? 'pass' : 'fail' },
      { title: '检查声明长度 ≤ 剩余字节', description: result.declared === null ? '等待完整头部' : `${result.declared} B ≤ ${Math.max(0, result.size - 6)} B`, state: !result.magicOK ? 'skip' : result.lengthOK ? 'pass' : 'fail' }
    ];
    const list = document.getElementById('trace-list');
    list.replaceChildren();
    checks.forEach((check, index) => {
      const row = document.createElement('li');
      const number = document.createElement('span');
      number.className = 'trace-index';
      number.textContent = String(index + 1).padStart(2, '0');
      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = check.title;
      const description = document.createElement('p');
      description.textContent = check.description;
      copy.append(title, description);
      const badge = document.createElement('span');
      badge.className = `trace-badge ${check.state}`;
      badge.textContent = { pass: 'PASS', fail: 'STOP', skip: 'SKIP' }[check.state];
      row.append(number, copy, badge);
      list.append(row);
    });
    setText('trace-count', '03 CHECKS');
  }

  function renderResult(result) {
    const outcomes = {
      valid: { icon: '✓', title: '通过校验', code: String(result.declared), summary: `声明 ${result.declared} B，实际剩余 ${result.payload.length} B；函数返回 ${result.declared}。`, meaning: '标识、头部与长度检查均通过。函数返回声明的载荷长度。' },
      short: { icon: '×', title: '头部不完整', code: '-1', summary: `输入只有 ${result.size} B，少于 6 B 的最短头部。`, meaning: '函数先检查空指针和最短长度，因此不会继续读取后续字节。' },
      magic: { icon: '×', title: '标识不匹配', code: '-2', summary: `前 4 字节为 “${printable(result.magic)}”，并非 “FRM1”。`, meaning: '逐字节比较失败后立即返回；页面没有执行对象文件。' },
      length: { icon: '×', title: '声明长度越界', code: '-3', summary: `声明 ${result.declared} B，剩余只有 ${result.payload.length} B。`, meaning: '函数拒绝超出实际剩余字节的载荷长度。' }
    };
    const data = outcomes[result.outcome];
    const icon = document.getElementById('result-icon');
    icon.className = `result-icon ${result.outcome === 'valid' ? 'success' : 'error'}`;
    icon.textContent = data.icon;
    setText('result-title', data.title);
    setText('result-code', data.code);
    setText('result-summary', data.summary);
    setText('result-meaning', data.meaning);
  }

  function renderInvalid(message) {
    ['byte-magic', 'ascii-magic', 'byte-length', 'decimal-length', 'byte-payload', 'payload-length'].forEach(id => setText(id, '—'));
    document.getElementById('trace-list').replaceChildren();
    setText('trace-count', 'INPUT ERROR');
    const icon = document.getElementById('result-icon');
    icon.className = 'result-icon error';
    icon.textContent = '!';
    setText('result-title', '输入格式有误');
    setText('result-code', '—');
    setText('result-summary', message);
    setText('result-meaning', '请修正输入后再次点击“分析输入”。');
  }

  const asmByOutcome = {
    valid: '00CC  cmp dword ptr [rsp], eax\n00CF  jbe 00D8                 ; 长度允许\n00D8  mov eax, dword ptr [rsp]\n00DF  ret',
    short: '001D  cmp qword ptr [rsp+20h], 0\n0023  je  002C\n0025  cmp dword ptr [rsp+28h], 6\n002A  jae 0036\n002C  mov eax, 0FFFFFFFFh      ; -1',
    magic: '0048  cmp eax, 46h             ; F\n004B  jne 0092\n005F  cmp eax, 52h             ; R\n0076  cmp eax, 4Dh             ; M\n008D  cmp eax, 31h             ; 1\n0092  mov eax, 0FFFFFFFEh      ; -2',
    length: '00C9  sub eax, 6\n00CC  cmp dword ptr [rsp], eax\n00CF  jbe 00D8\n00D1  mov eax, 0FFFFFFFDh      ; -3'
  };

  const evidence = {
    binary: {
      title: '文件头和可见字符串',
      description: '本地编译后的对象文件由 dumpbin 核对为 x64 COFF。代码位于 .text$mn；.data 中出现 “FRM1 payload gate”。字符串提供线索，具体规则仍需看函数条件。',
      code: 'FILE HEADER  8664 machine (x64)\nSECTION #3   .text$mn · E0 bytes\nSECTION #6   .data · 12 bytes\nRAW DATA     46 52 4D 31 20 70 61 79 ...\n             F  R  M  1     p  a  y  ...',
      source: 'dumpbin /headers · /rawdata'
    },
    asm: {
      title: '分支落在具体指令上',
      description: '右侧是本地 dumpbin 反汇编记录的节内偏移摘录，并非 Ghidra 截图。切换上方输入样例，可以看到对应的决定性比较与跳转。',
      source: 'dumpbin /disasm · .text$mn'
    },
    ir: {
      title: 'p-code 把处理器细节转换为语义',
      description: 'SLEIGH 给指令定义编码和语义；Ghidra 可把机器指令转换成 p-code，供数据流分析与反编译使用。右侧仅为等价关系示意，不是本样本的实测 p-code 输出。',
      code: 'available = size - 6\ntoo_large = INT_LESS(available, declared)\nCBRANCH reject_length, too_large',
      source: 'Ghidra SLEIGH / p-code 官方文档'
    },
    pseudo: {
      title: '把检查条件还原成可读逻辑',
      description: '这是依据本项目样本源码手写的简化逻辑，帮助理解反编译器希望呈现的结果；变量名与排版不代表 Ghidra 实际输出。',
      code: 'if (!data || size < 6) return -1;\nif (magic != "FRM1") return -2;\ndeclared = (data[4] << 8) | data[5];\nif (declared > size - 6) return -3;\nreturn declared;',
      source: '本仓库 fixture/frame_gate.c'
    }
  };

  function renderEvidence() {
    const item = evidence[stage];
    const panel = document.getElementById('evidence-content');
    panel.replaceChildren();
    const copy = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.description;
    const source = document.createElement('p');
    source.style.marginTop = '12px';
    source.textContent = `依据：${item.source}`;
    copy.append(title, description, source);
    const code = document.createElement('pre');
    code.className = 'evidence-code';
    code.textContent = stage === 'asm' ? asmByOutcome[current?.outcome ?? 'valid'] : item.code;
    panel.append(copy, code);
    tabs.forEach(tab => {
      const selected = tab.dataset.stage === stage;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', `tab-${stage}`);
  }

  function analyze() {
    try {
      current = inspect(parseBytes(input.value));
      renderBytes(current);
      renderTrace(current);
      renderResult(current);
    } catch (error) {
      current = null;
      renderInvalid(error.message);
    }
    renderEvidence();
  }

  presetButtons.forEach(button => button.addEventListener('click', () => {
    input.value = presets[button.dataset.preset];
    presetButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    analyze();
  }));
  input.addEventListener('input', () => presetButtons.forEach(button => button.setAttribute('aria-pressed', 'false')));
  input.addEventListener('keydown', event => { if (event.key === 'Enter') analyze(); });
  document.getElementById('run-button').addEventListener('click', analyze);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { stage = tab.dataset.stage; renderEvidence(); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      stage = tabs[next].dataset.stage;
      renderEvidence();
      tabs[next].focus();
    });
  });

  const fileInput = document.getElementById('file-input');
  const fileDrop = document.getElementById('file-drop');
  const fileEmpty = document.getElementById('file-empty');
  const fileResult = document.getElementById('file-result');
  const fileStatus = document.getElementById('file-status');

  function startsWith(bytes, signature) {
    return signature.every((byte, index) => bytes[index] === byte);
  }

  function machineName(value) {
    return ({ 0x014c: 'x86', 0x8664: 'x86-64', 0xaa64: 'ARM64', 0x01c0: 'ARM' })[value] ?? `机器码 0x${value.toString(16).toUpperCase()}`;
  }

  function detectFormat(bytes, name) {
    if (!bytes.length) return { kind: '空文件', arch: '无', next: '请选择包含实际字节的二进制文件。' };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) {
      const little = bytes[5] !== 2;
      const bits = bytes[4] === 2 ? '64 位' : bytes[4] === 1 ? '32 位' : '位数待核对';
      const machine = bytes.length >= 20 ? view.getUint16(18, little) : null;
      const names = { 3: 'x86', 8: 'MIPS', 40: 'ARM', 62: 'x86-64', 183: 'ARM64', 243: 'RISC-V' };
      return { kind: 'ELF 文件', arch: `${bits} · ${machine === null ? '架构待核对' : names[machine] ?? `机器码 ${machine}`}`, next: '在 Ghidra 用 File → Import File 导入；确认自动识别的处理器和节区。' };
    }
    if (startsWith(bytes, [0x4d, 0x5a])) {
      const offset = bytes.length >= 64 ? view.getUint32(0x3c, true) : -1;
      const isPE = offset >= 0 && offset + 6 <= bytes.length && startsWith(bytes.slice(offset), [0x50, 0x45, 0, 0]);
      const machine = isPE ? view.getUint16(offset + 4, true) : null;
      return { kind: isPE ? 'PE 可执行文件' : 'MZ 文件头线索', arch: machine === null ? '需要核对完整文件头' : machineName(machine), next: isPE ? '在 Ghidra 导入 PE，先查看导入表、字符串和函数调用，再验证行为假设。' : '浏览器只读取文件开头 4 KB；请在 Ghidra 中核对完整文件格式。' };
    }
    const magic = Array.from(bytes.slice(0, 4)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (magic === 'cafebabe') {
      return name.toLowerCase().endsWith('.class')
        ? { kind: 'Java class 文件', arch: 'JVM 字节码', next: '在 Ghidra 导入 Java class，查看类、方法和字节码；仍需确认文件内容。' }
        : { kind: 'Java class / Fat Mach-O 线索', arch: '仅凭前 4 字节有歧义', next: '请根据文件扩展名与后续文件头，在 Ghidra 中核对真实格式。' };
    }
    const macho = { feedface: '32 位 · 大端', cefaedfe: '32 位 · 小端', feedfacf: '64 位 · 大端', cffaedfe: '64 位 · 小端', bebafeca: 'Fat 容器' }[magic];
    if (macho) return { kind: 'Mach-O 文件', arch: macho, next: '在 Ghidra 导入，确认架构切片、节区和外部引用。' };
    if (startsWith(bytes, [0x64, 0x65, 0x78, 0x0a])) return { kind: 'DEX 字节码', arch: 'Dalvik/Android', next: '在 Ghidra 导入 DEX，查看类、方法和调用关系。' };
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return { kind: name.toLowerCase().endsWith('.apk') ? 'APK / ZIP 容器线索' : 'ZIP 容器线索', arch: '需要查看容器内容', next: '在 Ghidra 导入并检查容器内的程序；仅凭 ZIP 头不能确认内部文件。' };
    if (bytes.length >= 20) {
      const machine = view.getUint16(0, true);
      const sections = view.getUint16(2, true);
      const optional = view.getUint16(16, true);
      if ([0x014c, 0x8664, 0xaa64, 0x01c0].includes(machine) && sections >= 1 && sections <= 96 && optional === 0) {
        return { kind: '可能是 COFF 对象文件', arch: machineName(machine), next: '可在 Ghidra 中按 COFF 导入，查看节区、符号、反汇编和交叉引用。' };
      }
    }
    if (/\.(c|h|cpp|hpp|js|ts|py|json|md|txt|html|css)$/i.test(name)) {
      return { kind: '文本或源码文件', arch: '不适用', next: '这通常不是逆向分析的编译产物；若要研究程序行为，请取得对应二进制文件。' };
    }
    return { kind: '原始或未知格式', arch: '无法仅凭文件头判断', next: '先确认文件来源；若确为裸二进制，再用 Ghidra 的 Raw Binary 导入并设置处理器、字节序与基址。' };
  }

  async function inspectLocalFile(file) {
    fileStatus.textContent = '正在读取文件头…';
    try {
      const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
      const detected = detectFormat(bytes, file.name);
      fileEmpty.hidden = true;
      fileResult.hidden = false;
      setText('file-kind', detected.kind);
      setText('file-name', file.name);
      setText('file-size', `${new Intl.NumberFormat('zh-CN').format(file.size)} 字节`);
      setText('file-arch', detected.arch);
      setText('file-hex', hex(Array.from(bytes.slice(0, 32))));
      setText('file-next', detected.next);
      fileStatus.textContent = `已读取 ${Math.min(file.size, 4096)} 字节作初步判断；未上传或执行文件。`;
    } catch {
      fileStatus.textContent = '文件头读取失败，请重新选择。';
    }
  }

  fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) inspectLocalFile(fileInput.files[0]); });
  fileDrop.addEventListener('click', () => fileInput.click());
  fileDrop.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });
  fileDrop.addEventListener('dragover', event => { event.preventDefault(); fileDrop.classList.add('drag-active'); });
  fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag-active'));
  fileDrop.addEventListener('drop', event => {
    event.preventDefault();
    fileDrop.classList.remove('drag-active');
    if (event.dataTransfer?.files?.[0]) inspectLocalFile(event.dataTransfer.files[0]);
  });
  analyze();
})();
