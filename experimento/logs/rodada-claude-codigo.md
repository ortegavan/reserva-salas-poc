Date: 2024-06-19 15:15:00
Model: Default (Opus 5.5 · Best for everyday, complex tasks)

I added three spec files and ran them with the project's existing Jest setup. The suite is stable: 96 tests, 85 passing and 11 failing, with the same 11 failures on every run. I ran it 3 times normally and once with --runInBand --no-cache --randomize. I looked at each failure and all 11 come from the production code, so I left the tests as they are. Only the three new .spec.ts files were created; nothing else changed.

What was created

- src/app/reserva/regras-reserva.service.spec.ts: covers each business rule, including the boundary values.
- src/app/reserva/sala.service.spec.ts: checks the GET and POST URLs, URL encoding of the room code, the request body and HTTP error propagation, using HttpTestingController.
- src/app/reserva/reserva.component.spec.ts: renders the real template. SalaService is replaced by a stub controlled with Subjects, RELOGIO is fixed to 2026-10-19 and Jest's fake timers handle the 300 ms delay. It covers:
  - the initial state;
  - the room lookup: waits for typing to stop, cancels an outdated lookup, handles not-found and errors;
  - validation and the on-screen messages;
  - the manager-approval notice;
  - submitting the booking: success, error, and clearing previous messages.

Mismatches found in the production code

I had no separate spec, so I took the expected behaviour from the messages the form shows the user.

#: 1
File: regras-reserva.service.ts:3
Mismatch: The room-code pattern /^[A-Z]{2}-\d{3}/ is missing $ at the end. It accepts AZ-1012, AZ-101X and AZ-101 , but the form says the
code is "duas letras maiúsculas, hífen e três dígitos".
Failing tests: 3
────────────────────────────────────────
#: 2
File: regras-reserva.service.ts:28
Mismatch: hora <= 20 accepts start times from 20:00 to 20:59, but the form says meetings start "entre 07h00 e 19h59". It should be hora <=
19 or hora < 20.
Failing tests: 3 in the service + 1 in the component
────────────────────────────────────────
#: 3
File: regras-reserva.service.ts:24-27
Mismatch: A time without minutes, like "08", is accepted: the minutes come out as undefined and Number.isNaN(undefined) is false, so the
invalid-value check is skipped. The type="time" field doesn't send that format, so it's low impact, but the rule itself is wrong.
Failing tests: 1
────────────────────────────────────────
#: 4
File: reserva.component.ts:75-92
Mismatch: When the room code changes, the old room stays in sala() until the new lookup returns, so the form stays valid. A user can submit
the new code in that gap, with capacity checked against the previous room. The screen also keeps showing the old room's details instead
of "Consultando sala…".
Failing tests: 1
────────────────────────────────────────
#: 5
File: reserva.component.html:61
Mismatch: [disabled]="form.invalid && !enviando()" is never true while a booking is being sent, so the button stays enabled and allows
double submission. It should probably be form.invalid || enviando(), and reservar() doesn't check enviando either.
Failing tests: 1
────────────────────────────────────────
#: 6
File: reserva.component.ts:52
Mismatch: The date field has no validator for past dates. The template's [min]="hoje" doesn't help, because Angular adds novalidate to
forms and Reactive Forms doesn't validate min on date fields, so a booking for yesterday goes through. This one is my inference from min;
if past dates are allowed on purpose, delete the test recusa data anterior a hoje.
Failing tests: 1

Points I tested as they are but that deserve a look:

- HTTP errors count as "not found": any lookup error, including a 500, shows "Sala não encontrada."
- "Consultando sala…" for invalid codes: it also appears while typing a code in the wrong format, even though no request goes out.
