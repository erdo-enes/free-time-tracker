#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <switch.h>
#include "http.h"
#include "game_detect.h"

#define SERVER_URL "http://192.168.1.100:8000/api/gaming/switch/ingest"
#define POLL_INTERVAL_NS 30000000000ULL
#define MAX_GAME_NAME 64

static char s_last_game[MAX_GAME_NAME] = {0};
static bool s_was_playing = false;
static char s_device_name[32] = {0};

static void get_device_name(void) {
    SetSysSerialNumber serial;
    setsysGetSerialNumber(&serial);
    snprintf(s_device_name, sizeof(s_device_name), "Switch-%c%c%c", serial.serial[0], serial.serial[1], serial.serial[2]);
}

static void build_json(char *out, size_t out_size, const char *game_name, bool is_start) {
    u64 now = 0;
    timeGetCurrentTime(TimeType_LocalSystemClock, &now);
    time_t t = (time_t)now;
    struct tm *tm_info = localtime(&t);
    char timestamp[40];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", tm_info);

    if (is_start) {
        snprintf(out, out_size,
            "{\"game_name\":\"%s\",\"started_at\":\"%s\",\"device_name\":\"%s\"}",
            game_name, timestamp, s_device_name);
    } else {
        snprintf(out, out_size,
            "{\"game_name\":\"%s\",\"ended_at\":\"%s\",\"device_name\":\"%s\"}",
            game_name, timestamp, s_device_name);
    }
}

static void send_session(const char *game_name, bool is_start) {
    char json[512];
    build_json(json, sizeof(json), game_name, is_start);
    http_post_json(SERVER_URL, json);
}

int main(int argc, char **argv) {
    Result rc = romfsInit();
    if (R_FAILED(rc)) {
        rc = 0;
    }

    http_init();
    game_detect_init();
    get_device_name();

    while (appletMainLoop()) {
        svcSleepThread(POLL_INTERVAL_NS);

        GameInfo game;
        bool playing = game_detect_current(&game);

        if (playing && game.is_valid) {
            if (!s_was_playing || strcmp(s_last_game, game.name) != 0) {
                if (s_was_playing) {
                    send_session(s_last_game, false);
                }
                strncpy(s_last_game, game.name, MAX_GAME_NAME - 1);
                s_last_game[MAX_GAME_NAME - 1] = '\0';
                send_session(s_last_game, true);
                s_was_playing = true;
            }
        } else {
            if (s_was_playing) {
                send_session(s_last_game, false);
                s_was_playing = false;
                s_last_game[0] = '\0';
            }
        }
    }

    if (s_was_playing) {
        send_session(s_last_game, false);
    }

    game_detect_exit();
    http_exit();
    romfsExit();
    return 0;
}
