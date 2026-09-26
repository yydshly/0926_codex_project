// Ghidra headless post-script: export the real decompiler result for the demo.
// @category Research
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class ExportGameSave extends GhidraScript {
    @Override
    public void run() throws Exception {
        String programName = currentProgram.getName();
        String language = currentProgram.getLanguageID().toString();
        String compilerSpec = currentProgram.getCompilerSpec().getCompilerSpecID().toString();
        println("GHIDRA_PROGRAM: " + programName);
        println("LANGUAGE: " + language);
        println("COMPILER_SPEC: " + compilerSpec);

        Function target = null;
        FunctionIterator functions = currentProgram.getFunctionManager().getFunctions(true);
        while (functions.hasNext()) {
            Function candidate = functions.next();
            if (candidate.getName().equals("inspect_save")) {
                target = candidate;
                break;
            }
        }
        if (target == null) {
            target = currentProgram.getFunctionManager().getFunctionContaining(toAddr(0x1400014a4L));
        }
        if (target == null) {
            throw new IllegalStateException("Could not locate the save inspection function");
        }

        println("FUNCTION: " + target.getName() + " @ " + target.getEntryPoint());
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        DecompileResults result = decompiler.decompileFunction(target, 60, monitor);
        if (!result.decompileCompleted() || result.getDecompiledFunction() == null) {
            throw new IllegalStateException("Decompilation failed: " + result.getErrorMessage());
        }
        String decompiled = result.getDecompiledFunction().getC();
        println("DECOMPILATION_BEGIN");
        println(decompiled);
        println("DECOMPILATION_END");
        String[] args = getScriptArgs();
        if (args.length > 0) {
            String normalized = decompiled.replace("\r\n", "\n")
                .replaceAll("(?m)[ \\t]+$", "").stripTrailing();
            String report = "GHIDRA 12.1.4 PUBLIC / actual headless decompiler output\n"
                + "PROGRAM: " + programName + "\n"
                + "LANGUAGE: " + language + "\n"
                + "COMPILER_SPEC: " + compilerSpec + "\n"
                + "FUNCTION: " + target.getName() + " @ " + target.getEntryPoint() + "\n"
                + "\n=== DECOMPILED C ===\n"
                + normalized + "\n";
            Files.writeString(Path.of(args[0]), report, StandardCharsets.UTF_8);
            println("REPORT_WRITTEN: " + args[0]);
        }
        decompiler.dispose();
    }
}
