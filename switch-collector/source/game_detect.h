#ifndef _GAME_DETECT_H_
#define _GAME_DETECT_H_

#include <switch.h>
#include <stdbool.h>

typedef struct {
    u64 title_id;
    char name[64];
    bool is_valid;
} GameInfo;

void game_detect_init(void);
void game_detect_exit(void);
bool game_detect_current(GameInfo *out);

#endif
