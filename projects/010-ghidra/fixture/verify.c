/* Execute the same four cases shown in the web demonstration. */
extern int inspect_frame(const unsigned char *data, unsigned int size);

int main(void) {
    const unsigned char valid[] = {0x46, 0x52, 0x4d, 0x31, 0x00, 0x03, 0x41, 0x42, 0x43};
    const unsigned char short_header[] = {0x46, 0x52, 0x4d, 0x31, 0x00};
    const unsigned char wrong_magic[] = {0x46, 0x52, 0x4d, 0x32, 0x00, 0x03, 0x41, 0x42, 0x43};
    const unsigned char too_long[] = {0x46, 0x52, 0x4d, 0x31, 0x00, 0x05, 0x41, 0x42, 0x43};

    if (inspect_frame(valid, sizeof valid) != 3) return 1;
    if (inspect_frame(short_header, sizeof short_header) != -1) return 2;
    if (inspect_frame(wrong_magic, sizeof wrong_magic) != -2) return 3;
    if (inspect_frame(too_long, sizeof too_long) != -3) return 4;
    return 0;
}
