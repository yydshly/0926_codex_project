"""Read the PE headers and map this teaching binary's key virtual addresses."""
from hashlib import sha256
from pathlib import Path
import struct
import sys


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from("<I", data, offset)[0]


def u64(data: bytes, offset: int) -> int:
    return struct.unpack_from("<Q", data, offset)[0]


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("game_save.exe")
    data = source.read_bytes()
    assert data[:2] == b"MZ", "not an MZ executable"
    pe = u32(data, 0x3C)
    assert data[pe:pe + 4] == b"PE\0\0", "not a PE executable"
    machine = u16(data, pe + 4)
    sections = u16(data, pe + 6)
    optional = pe + 24
    assert u16(data, optional) == 0x20B, "not PE32+"
    image_base = u64(data, optional + 24)
    entry_rva = u32(data, optional + 16)
    section_start = optional + u16(data, pe + 20)
    names = {}
    for index in range(sections):
        header = section_start + index * 40
        name = data[header:header + 8].split(b"\0")[0].decode("ascii", "replace")
        names[name] = (u32(data, header + 12), u32(data, header + 20))
    text_rva, text_file = names[".text"]

    def mapped(rva: int) -> str:
        file_offset = text_file + rva - text_rva
        return f"VA 0x{image_base + rva:08X} -> RVA 0x{rva:X} -> file offset 0x{file_offset:X} -> {data[file_offset:file_offset + 8].hex(' ').upper()}"

    digest = sha256(data).hexdigest()
    lines = [
        "PE HEADER / actual bytes from game_save.exe",
        f"SHA-256: {digest}",
        f"FILE SIZE: {len(data)} bytes",
        f"OFFSET 0x0: {data[:16].hex(' ').upper()}  (MZ at start)",
        f"OFFSET 0x3C: {data[0x3C:0x40].hex(' ').upper()}  (e_lfanew = 0x{pe:X})",
        f"OFFSET 0x{pe:X}: {data[pe:pe + 8].hex(' ').upper()}  (PE signature then machine 0x{machine:04X})",
        f"OPTIONAL HEADER: PE32+, image base 0x{image_base:X}, entry RVA 0x{entry_rva:X}",
        f".text: RVA 0x{text_rva:X}, file offset 0x{text_file:X}",
        f".rdata: RVA 0x{names['.rdata'][0]:X}, file offset 0x{names['.rdata'][1]:X}",
    ]
    if digest == "fe7caccd3d193f46b4eded4276d279cfd91004f6a2f219b7a8388e1468a3fbd5":
        lines.extend([
            "KEY ADDRESS MAPPING FOR THIS BUILD:",
            mapped(0x14A4),
            mapped(0x16A0),
            mapped(0x1534),
            mapped(0x154E),
            mapped(0x1551),
            mapped(0x1553),
        ])
    else:
        lines.append("KEY ADDRESS MAPPING: omitted because the binary hash differs; rerun Ghidra.")
    report = "\n".join(lines) + "\n"
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(report, encoding="utf-8", newline="\n")
    else:
        print(report, end="")


if __name__ == "__main__":
    main()
