/* A small, reproducible Windows game client for a save-file investigation.
 * The source is published only so readers can check the binary findings.
 * The Ghidra run imports game_save.exe, not this file.
 */
#include <stdint.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    uint8_t level;
    uint32_t score;
} SaveState;

/* Format: "GSV1" | version=1 | payload_length=5 | level | score LE | XOR. */
__attribute__((noinline))
int inspect_save(const uint8_t *bytes, size_t size, SaveState *out) {
    if (size != 12) return 3;
    if (memcmp(bytes, "GSV1", 4) != 0) return 4;
    if (bytes[4] != 1 || bytes[5] != 5) return 5;

    uint8_t checksum = 0x5a;
    for (size_t i = 6; i <= 10; ++i) checksum ^= bytes[i];
    if (checksum != bytes[11]) return 6;
    if (bytes[6] < 1 || bytes[6] > 50) return 7;

    out->level = bytes[6];
    out->score = (uint32_t)bytes[7]
               | ((uint32_t)bytes[8] << 8)
               | ((uint32_t)bytes[9] << 16)
               | ((uint32_t)bytes[10] << 24);
    return 0;
}

int main(int argc, char **argv) {
    uint8_t bytes[64];
    SaveState state;
    size_t size;
    FILE *file;
    int result;

    if (argc != 2) {
        puts("usage: game_save.exe <save-file>");
        return 1;
    }
    file = fopen(argv[1], "rb");
    if (file == NULL) {
        puts("SAVE REJECTED: cannot open file");
        return 2;
    }
    size = fread(bytes, 1, sizeof bytes, file);
    fclose(file);
    result = inspect_save(bytes, size, &state);

    switch (result) {
        case 0:
            printf("SAVE OK: level=%u score=%u\n", state.level, state.score);
            break;
        case 3: puts("SAVE REJECTED: wrong file size"); break;
        case 4: puts("SAVE REJECTED: bad magic"); break;
        case 5: puts("SAVE REJECTED: unsupported version or payload"); break;
        case 6: puts("SAVE REJECTED: checksum mismatch"); break;
        case 7: puts("SAVE REJECTED: invalid level"); break;
        default: puts("SAVE REJECTED: unknown error"); break;
    }
    return result;
}
