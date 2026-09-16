#define GRID_X 9
#define GRID_Y 7
#define GRID_Z 9
#define MAX_LENGTH 96

static int snake_x[MAX_LENGTH];
static int snake_y[MAX_LENGTH];
static int snake_z[MAX_LENGTH];
static int snake_length;
static int food_x;
static int food_y;
static int food_z;
static unsigned int random_state = 0x51a4e31u;

static unsigned int next_random(void) {
  random_state ^= random_state << 13;
  random_state ^= random_state >> 17;
  random_state ^= random_state << 5;
  return random_state;
}

static int occupied(int x, int y, int z, int ignore_tail) {
  int limit = snake_length - ignore_tail;
  for (int i = 0; i < limit; i++) {
    if (snake_x[i] == x && snake_y[i] == y && snake_z[i] == z) return 1;
  }
  return 0;
}

static void place_food(void) {
  for (int attempt = 0; attempt < 512; attempt++) {
    int x = (int)(next_random() % GRID_X);
    int y = (int)(next_random() % GRID_Y);
    int z = (int)(next_random() % GRID_Z);
    if (!occupied(x, y, z, 0)) {
      food_x = x; food_y = y; food_z = z;
      return;
    }
  }
}

__attribute__((export_name("snake_init")))
void snake_init(unsigned int seed) {
  random_state = seed ? seed : 0x51a4e31u;
  snake_length = 12;
  for (int i = 0; i < snake_length; i++) {
    snake_y[i] = GRID_Y / 2;
    snake_x[i] = i < GRID_Z ? GRID_X / 2 : GRID_X / 2 - (i - GRID_Z + 1);
    snake_z[i] = i < GRID_Z ? GRID_Z - 1 - i : 0;
  }
  place_food();
}

static int distance_to_food(int x, int y, int z) {
  int dx = x - food_x; if (dx < 0) dx = -dx;
  int dy = y - food_y; if (dy < 0) dy = -dy;
  int dz = z - food_z; if (dz < 0) dz = -dz;
  return dx + dy + dz;
}

__attribute__((export_name("snake_step")))
void snake_step(void) {
  static const int directions[6][3] = {
    {1,0,0}, {-1,0,0}, {0,1,0}, {0,-1,0}, {0,0,1}, {0,0,-1}
  };
  int best = -1;
  int best_score = 100000;
  unsigned int offset = next_random() % 6;

  for (int n = 0; n < 6; n++) {
    int d = (n + (int)offset) % 6;
    int x = snake_x[0] + directions[d][0];
    int y = snake_y[0] + directions[d][1];
    int z = snake_z[0] + directions[d][2];
    if (x < 0 || x >= GRID_X || y < 0 || y >= GRID_Y || z < 0 || z >= GRID_Z) continue;
    if (occupied(x, y, z, 1)) continue;
    int score = distance_to_food(x, y, z) * 16 + (int)(next_random() & 7);
    /* Staying away from walls makes the path feel less mechanical. */
    if (x == 0 || x == GRID_X - 1) score += 3;
    if (y == 0 || y == GRID_Y - 1) score += 3;
    if (z == 0 || z == GRID_Z - 1) score += 3;
    if (score < best_score) { best_score = score; best = d; }
  }

  if (best < 0) {
    snake_init(next_random());
    return;
  }

  int new_x = snake_x[0] + directions[best][0];
  int new_y = snake_y[0] + directions[best][1];
  int new_z = snake_z[0] + directions[best][2];
  int ate = new_x == food_x && new_y == food_y && new_z == food_z;
  if (ate && snake_length < MAX_LENGTH) snake_length++;
  for (int i = snake_length - 1; i > 0; i--) {
    snake_x[i] = snake_x[i - 1];
    snake_y[i] = snake_y[i - 1];
    snake_z[i] = snake_z[i - 1];
  }
  snake_x[0] = new_x; snake_y[0] = new_y; snake_z[0] = new_z;
  if (ate) place_food();
}

__attribute__((export_name("snake_length"))) int get_snake_length(void) { return snake_length; }
__attribute__((export_name("snake_x"))) int get_snake_x(int i) { return snake_x[i]; }
__attribute__((export_name("snake_y"))) int get_snake_y(int i) { return snake_y[i]; }
__attribute__((export_name("snake_z"))) int get_snake_z(int i) { return snake_z[i]; }
__attribute__((export_name("food_x"))) int get_food_x(void) { return food_x; }
__attribute__((export_name("food_y"))) int get_food_y(void) { return food_y; }
__attribute__((export_name("food_z"))) int get_food_z(void) { return food_z; }
