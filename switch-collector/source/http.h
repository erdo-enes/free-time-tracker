#ifndef _HTTP_H_
#define _HTTP_H_

#include <switch.h>

Result http_post_json(const char *url, const char *json_body);
Result http_init(void);
void http_exit(void);

#endif
