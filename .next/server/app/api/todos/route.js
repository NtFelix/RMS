/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/todos/route";
exports.ids = ["app/api/todos/route"];
exports.modules = {

/***/ "(rsc)/./app/api/todos/route.ts":
/*!********************************!*\
  !*** ./app/api/todos/route.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   PATCH: () => (/* binding */ PATCH),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_supabase_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/supabase-server */ \"(rsc)/./lib/supabase-server.ts\");\n\n\n// GET todos\nasync function GET(request) {\n    const supabase = (0,_lib_supabase_server__WEBPACK_IMPORTED_MODULE_1__.createSupabaseServerClient)();\n    try {\n        const { data, error } = await supabase.from(\"Aufgaben\").select(\"*\").order(\"erstellungsdatum\", {\n            ascending: false\n        });\n        if (error) throw error;\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data);\n    } catch (error) {\n        console.error(\"Error fetching todos:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Fehler beim Laden der Aufgaben\"\n        }, {\n            status: 500\n        });\n    }\n}\n// POST new todo\nasync function POST(request) {\n    const supabase = (0,_lib_supabase_server__WEBPACK_IMPORTED_MODULE_1__.createSupabaseServerClient)();\n    try {\n        const body = await request.json();\n        const { name, beschreibung, ist_erledigt } = body;\n        if (!name || !beschreibung) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Name und Beschreibung sind erforderlich\"\n            }, {\n                status: 400\n            });\n        }\n        const { data, error } = await supabase.from(\"Aufgaben\").insert([\n            {\n                name,\n                beschreibung,\n                ist_erledigt: ist_erledigt || false\n            }\n        ]).select();\n        if (error) throw error;\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data[0]);\n    } catch (error) {\n        console.error(\"Error creating todo:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Fehler beim Erstellen der Aufgabe\"\n        }, {\n            status: 500\n        });\n    }\n}\n// PATCH to update todo status\nasync function PATCH(request) {\n    const supabase = (0,_lib_supabase_server__WEBPACK_IMPORTED_MODULE_1__.createSupabaseServerClient)();\n    try {\n        const body = await request.json();\n        const { id, ist_erledigt } = body;\n        if (!id) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"ID ist erforderlich\"\n            }, {\n                status: 400\n            });\n        }\n        const { data, error } = await supabase.from(\"Aufgaben\").update({\n            ist_erledigt,\n            aenderungsdatum: new Date().toISOString()\n        }).eq(\"id\", id).select();\n        if (error) throw error;\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data[0]);\n    } catch (error) {\n        console.error(\"Error updating todo:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Fehler beim Aktualisieren der Aufgabe\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3RvZG9zL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQXVEO0FBQ1c7QUFFbEUsWUFBWTtBQUNMLGVBQWVFLElBQUlDLE9BQW9CO0lBQzVDLE1BQU1DLFdBQVdILGdGQUEwQkE7SUFFM0MsSUFBSTtRQUNGLE1BQU0sRUFBRUksSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNRixTQUMzQkcsSUFBSSxDQUFDLFlBQ0xDLE1BQU0sQ0FBQyxLQUNQQyxLQUFLLENBQUMsb0JBQW9CO1lBQUVDLFdBQVc7UUFBTTtRQUVoRCxJQUFJSixPQUFPLE1BQU1BO1FBRWpCLE9BQU9OLHFEQUFZQSxDQUFDVyxJQUFJLENBQUNOO0lBQzNCLEVBQUUsT0FBT0MsT0FBTztRQUNkTSxRQUFRTixLQUFLLENBQUMseUJBQXlCQTtRQUN2QyxPQUFPTixxREFBWUEsQ0FBQ1csSUFBSSxDQUN0QjtZQUFFTCxPQUFPO1FBQWlDLEdBQzFDO1lBQUVPLFFBQVE7UUFBSTtJQUVsQjtBQUNGO0FBRUEsZ0JBQWdCO0FBQ1QsZUFBZUMsS0FBS1gsT0FBb0I7SUFDN0MsTUFBTUMsV0FBV0gsZ0ZBQTBCQTtJQUUzQyxJQUFJO1FBQ0YsTUFBTWMsT0FBTyxNQUFNWixRQUFRUSxJQUFJO1FBQy9CLE1BQU0sRUFBRUssSUFBSSxFQUFFQyxZQUFZLEVBQUVDLFlBQVksRUFBRSxHQUFHSDtRQUU3QyxJQUFJLENBQUNDLFFBQVEsQ0FBQ0MsY0FBYztZQUMxQixPQUFPakIscURBQVlBLENBQUNXLElBQUksQ0FDdEI7Z0JBQUVMLE9BQU87WUFBMEMsR0FDbkQ7Z0JBQUVPLFFBQVE7WUFBSTtRQUVsQjtRQUVBLE1BQU0sRUFBRVIsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNRixTQUMzQkcsSUFBSSxDQUFDLFlBQ0xZLE1BQU0sQ0FBQztZQUNOO2dCQUNFSDtnQkFDQUM7Z0JBQ0FDLGNBQWNBLGdCQUFnQjtZQUNoQztTQUNELEVBQ0FWLE1BQU07UUFFVCxJQUFJRixPQUFPLE1BQU1BO1FBRWpCLE9BQU9OLHFEQUFZQSxDQUFDVyxJQUFJLENBQUNOLElBQUksQ0FBQyxFQUFFO0lBQ2xDLEVBQUUsT0FBT0MsT0FBTztRQUNkTSxRQUFRTixLQUFLLENBQUMsd0JBQXdCQTtRQUN0QyxPQUFPTixxREFBWUEsQ0FBQ1csSUFBSSxDQUN0QjtZQUFFTCxPQUFPO1FBQW9DLEdBQzdDO1lBQUVPLFFBQVE7UUFBSTtJQUVsQjtBQUNGO0FBRUEsOEJBQThCO0FBQ3ZCLGVBQWVPLE1BQU1qQixPQUFvQjtJQUM5QyxNQUFNQyxXQUFXSCxnRkFBMEJBO0lBRTNDLElBQUk7UUFDRixNQUFNYyxPQUFPLE1BQU1aLFFBQVFRLElBQUk7UUFDL0IsTUFBTSxFQUFFVSxFQUFFLEVBQUVILFlBQVksRUFBRSxHQUFHSDtRQUU3QixJQUFJLENBQUNNLElBQUk7WUFDUCxPQUFPckIscURBQVlBLENBQUNXLElBQUksQ0FDdEI7Z0JBQUVMLE9BQU87WUFBc0IsR0FDL0I7Z0JBQUVPLFFBQVE7WUFBSTtRQUVsQjtRQUVBLE1BQU0sRUFBRVIsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNRixTQUMzQkcsSUFBSSxDQUFDLFlBQ0xlLE1BQU0sQ0FBQztZQUNOSjtZQUNBSyxpQkFBaUIsSUFBSUMsT0FBT0MsV0FBVztRQUN6QyxHQUNDQyxFQUFFLENBQUMsTUFBTUwsSUFDVGIsTUFBTTtRQUVULElBQUlGLE9BQU8sTUFBTUE7UUFFakIsT0FBT04scURBQVlBLENBQUNXLElBQUksQ0FBQ04sSUFBSSxDQUFDLEVBQUU7SUFDbEMsRUFBRSxPQUFPQyxPQUFPO1FBQ2RNLFFBQVFOLEtBQUssQ0FBQyx3QkFBd0JBO1FBQ3RDLE9BQU9OLHFEQUFZQSxDQUFDVyxJQUFJLENBQ3RCO1lBQUVMLE9BQU87UUFBd0MsR0FDakQ7WUFBRU8sUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9mZWxpeHBsYW50L0Rvd25sb2Fkcy9GZWxpeC9HaXRIdWItUmVwby9STVMvYXBwL2FwaS90b2Rvcy9yb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCJcbmltcG9ydCB7IGNyZWF0ZVN1cGFiYXNlU2VydmVyQ2xpZW50IH0gZnJvbSBcIkAvbGliL3N1cGFiYXNlLXNlcnZlclwiXG5cbi8vIEdFVCB0b2Rvc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZVN1cGFiYXNlU2VydmVyQ2xpZW50KClcbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKFwiQXVmZ2FiZW5cIilcbiAgICAgIC5zZWxlY3QoXCIqXCIpXG4gICAgICAub3JkZXIoXCJlcnN0ZWxsdW5nc2RhdHVtXCIsIHsgYXNjZW5kaW5nOiBmYWxzZSB9KVxuICAgIFxuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3JcbiAgICBcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oZGF0YSlcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZmV0Y2hpbmcgdG9kb3M6XCIsIGVycm9yKVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgIHsgZXJyb3I6IFwiRmVobGVyIGJlaW0gTGFkZW4gZGVyIEF1ZmdhYmVuXCIgfSxcbiAgICAgIHsgc3RhdHVzOiA1MDAgfVxuICAgIClcbiAgfVxufVxuXG4vLyBQT1NUIG5ldyB0b2RvXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZVN1cGFiYXNlU2VydmVyQ2xpZW50KClcbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpXG4gICAgY29uc3QgeyBuYW1lLCBiZXNjaHJlaWJ1bmcsIGlzdF9lcmxlZGlndCB9ID0gYm9keVxuICAgIFxuICAgIGlmICghbmFtZSB8fCAhYmVzY2hyZWlidW5nKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgZXJyb3I6IFwiTmFtZSB1bmQgQmVzY2hyZWlidW5nIHNpbmQgZXJmb3JkZXJsaWNoXCIgfSxcbiAgICAgICAgeyBzdGF0dXM6IDQwMCB9XG4gICAgICApXG4gICAgfVxuICAgIFxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbShcIkF1ZmdhYmVuXCIpXG4gICAgICAuaW5zZXJ0KFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgYmVzY2hyZWlidW5nLFxuICAgICAgICAgIGlzdF9lcmxlZGlndDogaXN0X2VybGVkaWd0IHx8IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIF0pXG4gICAgICAuc2VsZWN0KClcbiAgICBcbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yXG4gICAgXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGFbMF0pXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIGNyZWF0aW5nIHRvZG86XCIsIGVycm9yKVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgIHsgZXJyb3I6IFwiRmVobGVyIGJlaW0gRXJzdGVsbGVuIGRlciBBdWZnYWJlXCIgfSxcbiAgICAgIHsgc3RhdHVzOiA1MDAgfVxuICAgIClcbiAgfVxufVxuXG4vLyBQQVRDSCB0byB1cGRhdGUgdG9kbyBzdGF0dXNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQQVRDSChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZVN1cGFiYXNlU2VydmVyQ2xpZW50KClcbiAgXG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpXG4gICAgY29uc3QgeyBpZCwgaXN0X2VybGVkaWd0IH0gPSBib2R5XG4gICAgXG4gICAgaWYgKCFpZCkge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICB7IGVycm9yOiBcIklEIGlzdCBlcmZvcmRlcmxpY2hcIiB9LFxuICAgICAgICB7IHN0YXR1czogNDAwIH1cbiAgICAgIClcbiAgICB9XG4gICAgXG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKFwiQXVmZ2FiZW5cIilcbiAgICAgIC51cGRhdGUoe1xuICAgICAgICBpc3RfZXJsZWRpZ3QsXG4gICAgICAgIGFlbmRlcnVuZ3NkYXR1bTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9KVxuICAgICAgLmVxKFwiaWRcIiwgaWQpXG4gICAgICAuc2VsZWN0KClcbiAgICBcbiAgICBpZiAoZXJyb3IpIHRocm93IGVycm9yXG4gICAgXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGFbMF0pXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHVwZGF0aW5nIHRvZG86XCIsIGVycm9yKVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgIHsgZXJyb3I6IFwiRmVobGVyIGJlaW0gQWt0dWFsaXNpZXJlbiBkZXIgQXVmZ2FiZVwiIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApXG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJjcmVhdGVTdXBhYmFzZVNlcnZlckNsaWVudCIsIkdFVCIsInJlcXVlc3QiLCJzdXBhYmFzZSIsImRhdGEiLCJlcnJvciIsImZyb20iLCJzZWxlY3QiLCJvcmRlciIsImFzY2VuZGluZyIsImpzb24iLCJjb25zb2xlIiwic3RhdHVzIiwiUE9TVCIsImJvZHkiLCJuYW1lIiwiYmVzY2hyZWlidW5nIiwiaXN0X2VybGVkaWd0IiwiaW5zZXJ0IiwiUEFUQ0giLCJpZCIsInVwZGF0ZSIsImFlbmRlcnVuZ3NkYXR1bSIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImVxIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/todos/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/supabase-server.ts":
/*!********************************!*\
  !*** ./lib/supabase-server.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createSupabaseServerClient: () => (/* binding */ createSupabaseServerClient)\n/* harmony export */ });\n/* harmony import */ var _supabase_ssr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/ssr */ \"(rsc)/./node_modules/@supabase/ssr/dist/module/index.js\");\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n\n\nfunction createSupabaseServerClient() {\n    return (0,_supabase_ssr__WEBPACK_IMPORTED_MODULE_0__.createServerClient)(\"https://ocubnwzybybcbrhsnqqs.supabase.co\", \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdWJud3p5YnliY2JyaHNucXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNjUyMDEsImV4cCI6MjA2MDc0MTIwMX0.eNxDYHXxpWje_7YUOnWPXsvNNmK9eXpYaArvX6t0ZQQ\", {\n        cookies: {\n            get (name) {\n                const cookieStore = (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)();\n                const cookie = cookieStore.get(name);\n                return cookie?.value;\n            },\n            set (name, value, options) {\n            // Server components können keine Cookies setzen\n            },\n            remove (name, options) {\n            // Server components können keine Cookies entfernen\n            }\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2Utc2VydmVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUFrRDtBQUNaO0FBRy9CLFNBQVNFO0lBQ2QsT0FBT0YsaUVBQWtCQSxDQUN2QkcsMENBQW9DLEVBQ3BDQSxrTkFBeUMsRUFDekM7UUFDRUYsU0FBUztZQUNQTSxLQUFJQyxJQUFJO2dCQUNOLE1BQU1DLGNBQWNSLHFEQUFPQTtnQkFDM0IsTUFBTVMsU0FBU0QsWUFBWUYsR0FBRyxDQUFDQztnQkFDL0IsT0FBT0UsUUFBUUM7WUFDakI7WUFDQUMsS0FBSUosSUFBSSxFQUFFRyxLQUFLLEVBQUVFLE9BQXNCO1lBQ3JDLGdEQUFnRDtZQUNsRDtZQUNBQyxRQUFPTixJQUFJLEVBQUVLLE9BQXNCO1lBQ2pDLG1EQUFtRDtZQUNyRDtRQUNGO0lBQ0Y7QUFFSiIsInNvdXJjZXMiOlsiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9saWIvc3VwYWJhc2Utc2VydmVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVNlcnZlckNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zc3InXG5pbXBvcnQgeyBjb29raWVzIH0gZnJvbSAnbmV4dC9oZWFkZXJzJ1xuaW1wb3J0IHsgdHlwZSBDb29raWVPcHRpb25zIH0gZnJvbSAnQHN1cGFiYXNlL3NzcidcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN1cGFiYXNlU2VydmVyQ2xpZW50KCkge1xuICByZXR1cm4gY3JlYXRlU2VydmVyQ2xpZW50KFxuICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCEsXG4gICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkhLFxuICAgIHtcbiAgICAgIGNvb2tpZXM6IHtcbiAgICAgICAgZ2V0KG5hbWUpIHtcbiAgICAgICAgICBjb25zdCBjb29raWVTdG9yZSA9IGNvb2tpZXMoKVxuICAgICAgICAgIGNvbnN0IGNvb2tpZSA9IGNvb2tpZVN0b3JlLmdldChuYW1lKVxuICAgICAgICAgIHJldHVybiBjb29raWU/LnZhbHVlXG4gICAgICAgIH0sXG4gICAgICAgIHNldChuYW1lLCB2YWx1ZSwgb3B0aW9uczogQ29va2llT3B0aW9ucykge1xuICAgICAgICAgIC8vIFNlcnZlciBjb21wb25lbnRzIGvDtm5uZW4ga2VpbmUgQ29va2llcyBzZXR6ZW5cbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlKG5hbWUsIG9wdGlvbnM6IENvb2tpZU9wdGlvbnMpIHtcbiAgICAgICAgICAvLyBTZXJ2ZXIgY29tcG9uZW50cyBrw7ZubmVuIGtlaW5lIENvb2tpZXMgZW50ZmVybmVuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIClcbn1cbiJdLCJuYW1lcyI6WyJjcmVhdGVTZXJ2ZXJDbGllbnQiLCJjb29raWVzIiwiY3JlYXRlU3VwYWJhc2VTZXJ2ZXJDbGllbnQiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkiLCJnZXQiLCJuYW1lIiwiY29va2llU3RvcmUiLCJjb29raWUiLCJ2YWx1ZSIsInNldCIsIm9wdGlvbnMiLCJyZW1vdmUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabase-server.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftodos%2Froute&page=%2Fapi%2Ftodos%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftodos%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftodos%2Froute&page=%2Fapi%2Ftodos%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftodos%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_todos_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/todos/route.ts */ \"(rsc)/./app/api/todos/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/todos/route\",\n        pathname: \"/api/todos\",\n        filename: \"route\",\n        bundlePath: \"app/api/todos/route\"\n    },\n    resolvedPagePath: \"/Users/felixplant/Downloads/Felix/GitHub-Repo/RMS/app/api/todos/route.ts\",\n    nextConfigOutput,\n    userland: _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_todos_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZ0b2RvcyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGdG9kb3MlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZ0b2RvcyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUN3QjtBQUNyRztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL3RvZG9zL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS90b2Rvcy9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL3RvZG9zXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS90b2Rvcy9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9mZWxpeHBsYW50L0Rvd25sb2Fkcy9GZWxpeC9HaXRIdWItUmVwby9STVMvYXBwL2FwaS90b2Rvcy9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHdvcmtBc3luY1N0b3JhZ2UsXG4gICAgICAgIHdvcmtVbml0QXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftodos%2Froute&page=%2Fapi%2Ftodos%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftodos%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/cookie","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftodos%2Froute&page=%2Fapi%2Ftodos%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftodos%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();