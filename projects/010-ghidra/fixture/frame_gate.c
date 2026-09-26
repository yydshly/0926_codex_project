/* A deliberately small, benign binary-analysis specimen for this research page.
 * Format: ASCII "FRM1", two-byte big-endian payload length, then payload bytes.
 */

__declspec(dllexport) const char *frame_format_name(void) {
    return "FRM1 payload gate";
}

__declspec(dllexport) int inspect_frame(const unsigned char *data, unsigned int size) {
    unsigned int declared;

    if (data == 0 || size < 6) {
        return -1;
    }
    if (data[0] != 'F' || data[1] != 'R' || data[2] != 'M' || data[3] != '1') {
        return -2;
    }

    declared = ((unsigned int)data[4] << 8) | (unsigned int)data[5];
    if (declared > size - 6) {
        return -3;
    }
    return (int)declared;
}
