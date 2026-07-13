#include "http.h"
#include <string.h>
#include <stdlib.h>

static Service g_httpService;
static bool g_initialized = false;

Result http_init(void) {
    if (g_initialized) return 0;
    Result rc = httpcInitialize(HTTPC_SERVICE_TYPE_SYSTEM);
    if (R_FAILED(rc)) return rc;
    g_initialized = true;
    return 0;
}

void http_exit(void) {
    if (!g_initialized) return;
    httpcExit();
    g_initialized = false;
}

Result http_post_json(const char *url, const char *json_body) {
    if (!g_initialized) {
        Result rc = http_init();
        if (R_FAILED(rc)) return rc;
    }

    HttpcContext ctx;
    Result rc = httpcCreateContext(&ctx, HTTP_METHOD_POST, url);
    if (R_FAILED(rc)) return rc;

    rc = httpcSetAddRequestHeaderField(&ctx, "Content-Type", "application/json");
    if (R_FAILED(rc)) goto cleanup;

    size_t body_len = strlen(json_body);
    rc = httpcSetRequestData(&ctx, (const u8 *)json_body, body_len);
    if (R_FAILED(rc)) goto cleanup;

    rc = httpcBeginRequest(&ctx);
    if (R_FAILED(rc)) goto cleanup;

    u32 status_code = 0;
    rc = httpcGetResponseStatusCode(&ctx, &status_code);
    if (R_FAILED(rc)) goto cleanup;
    if (status_code < 200 || status_code >= 300) {
        rc = MAKERESULT(Module_Libnx, LibnxError_IoError);
    }

cleanup:
    httpcCloseContext(&ctx);
    return rc;
}
