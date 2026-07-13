#include "game_detect.h"
#include <string.h>

static bool g_glsl_init = false;

void game_detect_init(void) {
    if (!g_glsl_init) {
        glslInitialize();
        g_glsl_init = true;
    }
}

void game_detect_exit(void) {
    if (g_glsl_init) {
        glslExit();
        g_glsl_init = false;
    }
}

bool game_detect_current(GameInfo *out) {
    memset(out, 0, sizeof(GameInfo));
    out->is_valid = false;

    if (!g_glsl_init) game_detect_init();

    u64 pid = 0;
    Result rc = pmdmntGetProcessId(&pid, pmdmntGetProcessProgramIdDefault);
    if (R_FAILED(rc)) return false;

    u64 title_id = 0;
    rc = pglGetProgramId(&title_id, pid);
    if (R_FAILED(rc)) {
        rc = pminfoGetProgramId(&title_id, pid);
        if (R_FAILED(rc)) return false;
    }

    if (title_id == 0) return false;

    NsApplicationControlData *ctrl = NULL;
    size_t buf_size = sizeof(NsApplicationControlData) + 0x2000;
    ctrl = (NsApplicationControlData *)malloc(buf_size);
    if (!ctrl) return false;
    memset(ctrl, 0, buf_size);

    u64 actual_size = 0;
    rc = nsGetApplicationControlData(NsApplicationControlSource_Storage, title_id, ctrl, buf_size, &actual_size);
    if (R_SUCCEEDED(rc) && actual_size > 0) {
        strncpy(out->name, ctrl->nacp.lang[0].name, sizeof(out->name) - 1);
        out->name[sizeof(out->name) - 1] = '\0';
    } else {
        snprintf(out->name, sizeof(out->name), "TitleID_%016lX", title_id);
    }

    out->title_id = title_id;
    out->is_valid = true;

    free(ctrl);
    return true;
}
