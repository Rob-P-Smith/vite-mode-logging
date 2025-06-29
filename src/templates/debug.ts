// Mode-based logging helper functions that will be transformed by the build process
// These functions are declared globally and can be used anywhere without imports

declare global {
  function ALL(message: string): void;
  function DEV(message: string): void;
  function DEBUG(message: string): void;
  function PROD(message: string): void;
  function TEST(message: string): void;
}

// Make the functions available at runtime (though they'll be transformed)
(globalThis as any).ALL = function(_message: string) { /* no-op */ };
(globalThis as any).DEV = function(_message: string) { /* no-op */ };
(globalThis as any).DEBUG = function(_message: string) { /* no-op */ };
(globalThis as any).PROD = function(_message: string) { /* no-op */ };
(globalThis as any).TEST = function(_message: string) { /* no-op */ };

export {}; // Make this a module