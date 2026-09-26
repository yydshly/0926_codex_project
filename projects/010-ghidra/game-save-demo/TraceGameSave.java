// Ghidra headless post-script: capture actual addresses, bytes, instructions and p-code.
// @category Research
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.Function;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.pcode.PcodeOp;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class TraceGameSave extends GhidraScript {
    private String bytes(Instruction instruction) throws Exception {
        StringBuilder result = new StringBuilder();
        for (byte value : instruction.getBytes()) {
            if (result.length() > 0) result.append(' ');
            result.append(String.format("%02X", value & 0xff));
        }
        return result.toString();
    }

    private void instruction(StringBuilder report, long address) throws Exception {
        Instruction item = currentProgram.getListing().getInstructionAt(toAddr(address));
        if (item == null) throw new IllegalStateException("Missing instruction at " + Long.toHexString(address));
        report.append(String.format("%s | %-22s | %s\n", item.getAddress(), bytes(item), item));
        for (PcodeOp operation : item.getPcode()) {
            report.append("    p-code: ").append(operation).append('\n');
        }
    }

    @Override
    public void run() throws Exception {
        StringBuilder report = new StringBuilder();
        report.append("GHIDRA 12.1.4 PUBLIC / actual headless listing and p-code\n");
        report.append("PROGRAM: ").append(currentProgram.getName()).append('\n');
        report.append("FORMAT: ").append(currentProgram.getExecutableFormat()).append('\n');
        report.append("LANGUAGE: ").append(currentProgram.getLanguageID()).append('\n');
        report.append("IMAGE_BASE: ").append(currentProgram.getImageBase()).append('\n');
        report.append("\n=== MEMORY BLOCKS ===\n");
        for (MemoryBlock block : currentProgram.getMemory().getBlocks()) {
            if (block.getName().equals(".text") || block.getName().equals(".rdata")) {
                report.append(block.getName()).append(" | ").append(block.getStart())
                    .append(" | size ").append(block.getSize())
                    .append(" | executable ").append(block.isExecute()).append('\n');
            }
        }
        Function main = currentProgram.getFunctionManager().getFunctionAt(toAddr(0x1400015ecL));
        Function inspect = currentProgram.getFunctionManager().getFunctionAt(toAddr(0x1400014a4L));
        report.append("\n=== FUNCTION CANDIDATES ===\n");
        report.append("main: ").append(main == null ? "missing" : main.getName() + " @ " + main.getEntryPoint()).append('\n');
        report.append("save checker: ").append(inspect == null ? "missing" : inspect.getName() + " @ " + inspect.getEntryPoint()).append('\n');
        report.append("\n=== PATH FROM FILE READING TO CHECKER ===\n");
        instruction(report, 0x140001679L); // fread
        instruction(report, 0x1400016a0L); // call inspect_save
        report.append("\n=== CHECKER DECISION INSTRUCTIONS ===\n");
        for (long address : new long[] {
            0x1400014b8L, // size check
            0x1400014fbL, // version check
            0x140001518L, // initial checksum byte
            0x140001534L, // XOR
            0x14000154eL, // checksum compare
            0x140001551L, // branch on match
            0x140001553L  // return code 6
        }) instruction(report, address);
        String[] args = getScriptArgs();
        if (args.length != 1) throw new IllegalArgumentException("Expected report output path");
        Files.writeString(Path.of(args[0]), report.toString(), StandardCharsets.UTF_8);
        println("TRACE_WRITTEN: " + args[0]);
        println(report.toString());
    }
}
