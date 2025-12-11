const GAME_CONFIG = {
  GRAVITY: 0.5,
  JUMP_FORCE: -14,
  DOUBLE_JUMP_FORCE: -11,
  PLAYER_GROUND_Y: 96,
  INITIAL_SPEED: 2,
  MAX_SPEED: 14,
  SPEED_INCREMENT: 0.0005,
  SPEED_UP_DISTANCE: 100,
  OBSTACLE_SPAWN_RATE: 2500,
  COLLECTIBLE_SPAWN_RATE: 1200,
  PLATFORM_SPAWN_RATE: 3000,
  INVINCIBILITY_DURATION: 1500,
  SLIDE_DURATION: 500,
  MAX_LIVES: 3,
  MOOD_CHANGE_DISTANCE: 200
};

const ResponsiveHelper = {
  GetScaleFactor() {
    const screen_height = window.innerHeight;
    const screen_width = window.innerWidth;
    if (screen_height <= 360) {
      return 0.6;
    } else if (screen_height <= 480) {
      return 0.75;
    } else if (screen_height <= 600) {
      return 0.85;
    } else if (screen_width <= 800) {
      return 0.9;
    }
    return 1;
  },

  GetGroundY() {
    const screen_height = window.innerHeight;
    if (screen_height <= 360) {
      return 64;
    } else if (screen_height <= 480) {
      return 80;
    }
    return 96;
  },

  GetPlayerSize() {
    const scale = this.GetScaleFactor();
    const base_size = 80;
    return Math.floor(base_size * scale);
  },

  GetObstacleSize(type) {
    const scale = this.GetScaleFactor();
    const sizes = {
      spike: { width: 50, height: 50 },
      box: { width: 60, height: 60 },
      'tall-box': { width: 50, height: 90 },
      flying: { width: 70, height: 50 }
    };
    const base = sizes[type] || { width: 60, height: 60 };
    return {
      width: Math.floor(base.width * scale),
      height: Math.floor(base.height * scale)
    };
  },

  GetCollectibleSize(type) {
    const scale = this.GetScaleFactor();
    const base_size = type === 'heart' ? 38 : 40;
    const size = Math.floor(base_size * scale);
    return { width: size, height: size };
  },

  GetFlyingObstacleY() {
    const screen_height = window.innerHeight;
    if (screen_height <= 360) {
      return { min: 90, max: 110 };
    } else if (screen_height <= 480) {
      return { min: 110, max: 130 };
    }
    return { min: 130, max: 160 };
  },

  GetCollectibleY() {
    const screen_height = window.innerHeight;
    if (screen_height <= 360) {
      return { min: 90, max: 150 };
    } else if (screen_height <= 480) {
      return { min: 110, max: 180 };
    }
    return { min: 130, max: 220 };
  },

  GetJumpForce() {
    const screen_height = window.innerHeight;
    if (screen_height <= 360) {
      return -11;
    } else if (screen_height <= 480) {
      return -12;
    }
    return -14;
  },

  GetDoubleJumpForce() {
    const screen_height = window.innerHeight;
    if (screen_height <= 360) {
      return -9;
    } else if (screen_height <= 480) {
      return -10;
    }
    return -11;
  }
};

const BACKGROUND_MOODS = {
  DAY: {
    name: 'day',
    sky: 'linear-gradient(to bottom, #7dd3fc, #93c5fd, #60a5fa)',
    cloud_opacity: 1
  },
  SUNSET: {
    name: 'sunset',
    sky: 'linear-gradient(to bottom, #fbbf24, #f97316, #dc2626)',
    cloud_opacity: 0.8
  },
  NIGHT: {
    name: 'night',
    sky: 'linear-gradient(to bottom, #1e1b4b, #312e81, #4c1d95)',
    cloud_opacity: 0.5
  },
  DAWN: {
    name: 'dawn',
    sky: 'linear-gradient(to bottom, #fce7f3, #fbcfe8, #f9a8d4)',
    cloud_opacity: 0.9
  }
};

const OBSTACLE_TYPES = {
  SPIKE: 'spike',
  BOX: 'box',
  TALL_BOX: 'tall-box',
  FLYING: 'flying'
};

const COLLECTIBLE_TYPES = {
  COOKIE: 'cookie',
  GOLDEN_COOKIE: 'golden_cookie',
  MAGNET: 'magnet',
  FEVER: 'fever',
  HEART: 'heart'
};

const COLLECTIBLE_SCORES = {
  cookie: 10,
  golden_cookie: 50,
  magnet: 25,
  fever: 25,
  heart: 50
};

class GameUtils {
  static GenerateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static GetRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static GetRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  static CheckCollision(rect_a, rect_b) {
    return (
      rect_a.x < rect_b.x + rect_b.width &&
      rect_a.x + rect_a.width > rect_b.x &&
      rect_a.y < rect_b.y + rect_b.height &&
      rect_a.y + rect_a.height > rect_b.y
    );
  }

  static Lerp(start, end, factor) {
    return start + (end - start) * factor;
  }
}

class Player {
  constructor(element) {
    this.element = element;
    this.sprite_element = document.getElementById('player-sprite');
    this.UpdateSize();
    this.x = window.innerWidth * 0.15;
    this.y = this.ground_y;
    this.velocity_y = 0;
    this.is_jumping = false;
    this.is_sliding = false;
    this.is_double_jumping = false;
    this.can_double_jump = true;
    this.is_invincible = false;
    this.is_landing = false;
    this.slide_timer = null;
    this.current_sprite = 'run';
    window.addEventListener('resize', () => this.UpdateSize());
  }

  UpdateSize() {
    const size = ResponsiveHelper.GetPlayerSize();
    this.width = size;
    this.height = size;
    this.ground_y = ResponsiveHelper.GetGroundY();
    if (this.sprite_element) {
      this.sprite_element.style.width = `${size}px`;
      this.sprite_element.style.height = `${size}px`;
    }
    this.sprites = {
      run: 'images/run.png',
      jump_up: 'images/step1.png',
      jump_down: 'images/step2.png'
    };
  }

  SetSprite(sprite_name) {
    if (this.current_sprite !== sprite_name && this.sprites[sprite_name]) {
      this.current_sprite = sprite_name;
      this.sprite_element.src = this.sprites[sprite_name];
    }
  }

  Reset() {
    this.UpdateSize();
    this.y = this.ground_y;
    this.velocity_y = 0;
    this.is_jumping = false;
    this.is_sliding = false;
    this.is_double_jumping = false;
    this.can_double_jump = true;
    this.is_invincible = false;
    this.is_landing = false;
    this.element.classList.remove(
      'jumping',
      'sliding',
      'invincible',
      'landing'
    );
    this.SetSprite('run');
    this.UpdatePosition();
    if (this.slide_timer) {
      clearTimeout(this.slide_timer);
      this.slide_timer = null;
    }
  }

  Jump() {
    if (!this.is_jumping && !this.is_sliding) {
      this.velocity_y = ResponsiveHelper.GetJumpForce();
      this.is_jumping = true;
      this.is_landing = false;
      this.can_double_jump = true;
      this.element.classList.add('jumping');
      this.element.classList.remove('sliding', 'landing');
      this.SetSprite('jump_up');
    } else if (
      this.is_jumping &&
      this.can_double_jump &&
      !this.is_double_jumping
    ) {
      this.velocity_y = ResponsiveHelper.GetDoubleJumpForce();
      this.is_double_jumping = true;
      this.can_double_jump = false;
      this.SetSprite('jump_up');
      this.CreateJumpEffect();
    }
  }

  Slide() {
    if (!this.is_jumping && !this.is_sliding) {
      this.is_sliding = true;
      this.element.classList.add('sliding');
      this.element.classList.remove('jumping');
      this.slide_timer = setTimeout(() => {
        this.EndSlide();
      }, GAME_CONFIG.SLIDE_DURATION);
    }
  }

  EndSlide() {
    this.is_sliding = false;
    this.element.classList.remove('sliding');
    this.SetSprite('run');
    if (this.slide_timer) {
      clearTimeout(this.slide_timer);
      this.slide_timer = null;
    }
  }

  CreateJumpEffect() {
    const effect = document.createElement('div');
    effect.className = 'absolute w-8 h-8 rounded-full bg-white/50';
    effect.style.left = `${this.x}px`;
    effect.style.bottom = `${this.y}px`;
    effect.style.animation = 'collect-pop 0.3s ease-out forwards';
    document.getElementById('game-area').appendChild(effect);
    setTimeout(() => effect.remove(), 300);
  }

  Update() {
    if (this.is_jumping) {
      this.velocity_y += GAME_CONFIG.GRAVITY;
      this.y -= this.velocity_y;
      if (this.velocity_y > 0 && this.current_sprite === 'jump_up') {
        this.SetSprite('jump_down');
      }
      if (this.y <= this.ground_y) {
        this.y = this.ground_y;
        this.velocity_y = 0;
        this.is_jumping = false;
        this.is_double_jumping = false;
        this.can_double_jump = true;
        this.is_landing = true;
        this.element.classList.remove('jumping');
        this.element.classList.add('landing');
        this.SetSprite('jump_down');
        setTimeout(() => {
          this.is_landing = false;
          this.element.classList.remove('landing');
          if (!this.is_sliding) {
            this.SetSprite('run');
          }
        }, 150);
      }
    }
    this.UpdatePosition();
  }

  UpdatePosition() {
    gsap.set(this.element, { bottom: this.y });
  }

  GetHitbox() {
    const hitbox_shrink_x = 15;
    const hitbox_shrink_y = 12;
    if (this.is_sliding) {
      return {
        x: this.x + hitbox_shrink_x + 5,
        y: this.y,
        width: this.width - hitbox_shrink_x * 2 - 10,
        height: this.height * 0.15
      };
    }
    return {
      x: this.x + hitbox_shrink_x,
      y: this.y + hitbox_shrink_y,
      width: this.width - hitbox_shrink_x * 2,
      height: this.height - hitbox_shrink_y * 2
    };
  }

  SetInvincible(duration = GAME_CONFIG.INVINCIBILITY_DURATION) {
    this.is_invincible = true;
    this.element.classList.add('invincible');
    setTimeout(() => {
      this.is_invincible = false;
      this.element.classList.remove('invincible');
    }, duration);
  }

  TriggerHitEffect() {
    this.element.classList.add('hit-flash');
    setTimeout(() => {
      this.element.classList.remove('hit-flash');
    }, 300);
  }

  TriggerCollectGlow(type = 'cookie') {
    if (type === 'cookie') return;
    const glow_class =
      type === 'golden_cookie'
        ? 'collect-glow-golden'
        : type === 'fever'
        ? 'collect-glow-fever'
        : type === 'magnet'
        ? 'collect-glow-magnet'
        : type === 'heart'
        ? 'collect-glow-heart'
        : null;
    if (!glow_class) return;
    this.element.classList.add(glow_class);
    setTimeout(() => {
      this.element.classList.remove(glow_class);
    }, 200);
  }
}

class Obstacle {
  constructor(type, x, y) {
    this.id = GameUtils.GenerateId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.element = null;
    this.is_active = true;
    this.SetDimensions();
    this.CreateElement();
  }

  SetDimensions() {
    const size = ResponsiveHelper.GetObstacleSize(this.type);
    this.width = size.width;
    this.height = size.height;
  }

  CreateElement() {
    this.element = document.createElement('div');
    this.element.className = 'obstacle';
    this.element.id = `obstacle-${this.id}`;
    const inner = document.createElement('div');
    inner.className = `obstacle-${this.type}`;
    inner.style.width = `${this.width}px`;
    inner.style.height = `${this.height}px`;
    const img = document.createElement('img');
    img.draggable = false;
    img.alt = this.type;
    switch (this.type) {
      case OBSTACLE_TYPES.BOX:
        img.src = 'images/box.png';
        break;
      case OBSTACLE_TYPES.TALL_BOX:
        img.src = 'images/tall-box.png';
        break;
      case OBSTACLE_TYPES.FLYING:
        img.src = 'images/flying.png';
        break;
      case OBSTACLE_TYPES.SPIKE:
        img.src = 'images/box.png';
        break;
      default:
        img.src = 'images/box.png';
    }
    inner.appendChild(img);
    this.element.appendChild(inner);
    this.element.style.left = `${this.x}px`;
    this.element.style.bottom = `${this.y}px`;
    document.getElementById('obstacles').appendChild(this.element);
  }

  Update(speed) {
    this.x -= speed;
    gsap.set(this.element, { left: this.x });
    if (this.x < -this.width) {
      this.Destroy();
    }
  }

  GetHitbox() {
    const shrink = 5;
    if (this.type === OBSTACLE_TYPES.FLYING) {
      const bottom_shrink = 35;
      return {
        x: this.x + shrink,
        y: this.y + bottom_shrink,
        width: this.width - shrink * 2,
        height: this.height - bottom_shrink - shrink
      };
    }
    return {
      x: this.x + shrink,
      y: this.y + shrink,
      width: this.width - shrink * 2,
      height: this.height - shrink * 2
    };
  }

  Destroy() {
    this.is_active = false;
    gsap.killTweensOf(this.element);
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}

class Collectible {
  constructor(type, x, y) {
    this.id = GameUtils.GenerateId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.element = null;
    this.is_active = true;
    this.score_value = COLLECTIBLE_SCORES[type] || 10;

    this.SetDimensions();
    this.CreateElement();
  }

  SetDimensions() {
    const size = ResponsiveHelper.GetCollectibleSize(this.type);
    this.width = size.width;
    this.height = size.height;
  }

  CreateElement() {
    this.element = document.createElement('div');
    this.element.className = 'collectible';
    this.element.id = `collectible-${this.id}`;
    const inner = document.createElement('div');
    inner.className = `collectible-${this.type}`;
    inner.style.width = `${this.width}px`;
    inner.style.height = `${this.height}px`;
    const img = document.createElement('img');
    img.draggable = false;
    switch (this.type) {
      case COLLECTIBLE_TYPES.COOKIE:
        img.src = 'images/cookie.png';
        img.alt = 'cookie';
        break;
      case COLLECTIBLE_TYPES.GOLDEN_COOKIE:
        img.src = 'images/cookie.png';
        img.alt = 'golden cookie';
        inner.classList.add('golden-glow');
        break;
      case COLLECTIBLE_TYPES.MAGNET:
        img.src = 'images/cookie.png';
        img.alt = 'magnet';
        inner.classList.add('magnet-glow');
        break;
      case COLLECTIBLE_TYPES.FEVER:
        img.src = 'images/cookie.png';
        img.alt = 'fever';
        inner.classList.add('fever-glow');
        break;
      case COLLECTIBLE_TYPES.HEART:
        img.src = 'images/heart.png';
        img.alt = 'heart';
        break;
      default:
        img.src = 'images/cookie.png';
        img.alt = 'collectible';
    }
    inner.appendChild(img);
    this.element.appendChild(inner);
    this.element.style.left = `${this.x}px`;
    this.element.style.bottom = `${this.y}px`;
    document.getElementById('collectibles').appendChild(this.element);
  }

  Update(speed) {
    this.x -= speed;
    gsap.set(this.element, { left: this.x });
    if (this.x < -this.width) {
      this.Destroy();
    }
  }

  GetHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  Collect() {
    this.is_active = false;
    this.Destroy();
    this.CreateScorePopup();
    return this.score_value;
  }

  CreateScorePopup() {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${this.score_value}`;
    popup.style.left = `${this.x}px`;
    popup.style.bottom = `${this.y + 40}px`;
    document.getElementById('game-area').appendChild(popup);
    gsap.to(popup, {
      y: -30,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => popup.remove()
    });
  }

  Destroy() {
    this.is_active = false;
    gsap.killTweensOf(this.element);
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}

class Platform {
  constructor(x, y, width) {
    this.id = GameUtils.GenerateId();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 20;
    this.element = null;
    this.is_active = true;
    this.CreateElement();
  }

  CreateElement() {
    this.element = document.createElement('div');
    this.element.className = 'platform';
    this.element.id = `platform-${this.id}`;
    this.element.style.left = `${this.x}px`;
    this.element.style.bottom = `${this.y}px`;
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
    document.getElementById('platforms').appendChild(this.element);
  }

  Update(speed) {
    this.x -= speed;
    this.element.style.left = `${this.x}px`;
    if (this.x < -this.width) {
      this.Destroy();
    }
  }

  GetHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  Destroy() {
    this.is_active = false;
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}

class Cloud {
  constructor() {
    this.id = GameUtils.GenerateId();
    this.x = window.innerWidth + 100;
    this.y = GameUtils.GetRandomInt(15, window.innerHeight * 0.4);
    this.speed = GameUtils.GetRandomFloat(0.3, 1.2);
    this.scale = GameUtils.GetRandomFloat(1.0, 2.2);
    this.element = null;
    this.is_active = true;
    this.cloud_positions = [
      { x: 0, y: 0, w: 180, h: 100 }, // Top-left cloud
      { x: 200, y: 20, w: 120, h: 80 }, // Top-middle cloud
      { x: 350, y: 0, w: 150, h: 90 }, // Top-right cloud
      { x: 0, y: 120, w: 200, h: 110 }, // Bottom-left cloud
      { x: 220, y: 100, w: 180, h: 120 }, // Bottom-middle cloud
      { x: 400, y: 120, w: 160, h: 100 } // Bottom-right cloud
    ];
    this.cloud_index = GameUtils.GetRandomInt(
      0,
      this.cloud_positions.length - 1
    );
    this.CreateElement();
  }

  CreateElement() {
    const cloud_size = 100 * this.scale;
    this.element = document.createElement('div');
    this.element.className = 'cloud-cookie';
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.width = `${cloud_size}px`;
    this.element.style.height = `${cloud_size * 0.6}px`;
    this.element.style.opacity = GameUtils.GetRandomFloat(0.7, 1);
    const img = document.createElement('img');
    img.src = 'images/cloud.png';
    img.alt = 'cloud';
    img.draggable = false;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.objectFit = 'contain';
    this.element.appendChild(img);
    document.getElementById('clouds').appendChild(this.element);
  }

  Update() {
    this.x -= this.speed;
    gsap.set(this.element, { left: this.x });
    if (this.x < -200) {
      this.Destroy();
    }
  }

  Destroy() {
    this.is_active = false;
    gsap.killTweensOf(this.element);
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}

class GameManager {
  constructor() {
    this.is_running = false;
    this.is_paused = false;
    this.score = 0;
    this.distance = 0;
    this.cookies_collected = 0;
    this.lives = GAME_CONFIG.MAX_LIVES;
    this.high_score =
      parseInt(localStorage.getItem('cookie_runner_high_score')) || 0;
    this.speed = GAME_CONFIG.INITIAL_SPEED;
    this.player = null;
    this.obstacles = [];
    this.collectibles = [];
    this.platforms = [];
    this.clouds = [];
    this.last_obstacle_spawn = 0;
    this.last_collectible_spawn = 0;
    this.last_platform_spawn = 0;
    this.last_cloud_spawn = 0;
    this.animation_frame_id = null;
    this.last_time = 0;
    this.road_offset = 0;
    this.road_element = null;
    this.trees_element = null;
    this.total_cookies = this.LoadSavedCookies();
    this.high_score = this.LoadHighScore();
    this.inventory = this.LoadInventory();
    this.active_powerups = {
      cookie_boost: false,
      cookie_boost_timer: null,
      shield: 0,
      extra_hearts: 0,
      magnet: false,
      magnet_timer: null,
      fever: false,
      fever_timer: null
    };
    this.cookie_multiplier = 1;
    this.mood_list = [
      BACKGROUND_MOODS.DAY,
      BACKGROUND_MOODS.SUNSET,
      BACKGROUND_MOODS.NIGHT,
      BACKGROUND_MOODS.DAWN
    ];
    this.current_mood_index = 0;
    this.last_mood_change_distance = 0;
    this.game_container = null;
    this.InitElements();
    this.InitEventListeners();
    this.InitTrees();
    this.InitClouds();
    this.InitBackgroundElements();
    this.UpdateTotalCookiesUI();
    this.UpdatePowerupUI();
    this.InitResizeHandler();
    this.score_multiplier = 1;
  }

  LoadSavedCookies() {
    const saved = localStorage.getItem('game_total_cookies');
    return saved ? parseInt(saved, 10) : 0;
  }

  SaveCookies() {
    localStorage.setItem('game_total_cookies', this.total_cookies.toString());
  }

  LoadHighScore() {
    const saved = localStorage.getItem('game_high_score');
    return saved ? parseInt(saved, 10) : 0;
  }

  SaveHighScore() {
    if (this.score > this.high_score) {
      this.high_score = this.score;
      localStorage.setItem('game_high_score', this.high_score.toString());
    }
  }

  LoadInventory() {
    const saved = localStorage.getItem('game_inventory');
    return saved ? JSON.parse(saved) : {};
  }

  SaveInventory() {
    localStorage.setItem('game_inventory', JSON.stringify(this.inventory));
  }

  UsePowerup(type) {
    if (!this.inventory[type] || this.inventory[type] <= 0) return false;
    this.inventory[type]--;
    this.SaveInventory();
    switch (type) {
      case 'heart':
        this.active_powerups.extra_hearts++;
        break;
      case 'shield':
        this.active_powerups.shield++;
        break;
      case 'cookie_boost':
        this.active_powerups.cookie_boost = true;
        break;
    }
    this.UpdatePowerupUI();
    return true;
  }

  UpdatePowerupUI() {
    const powerup_panel = document.getElementById('powerup-panel');
    if (!powerup_panel) return;
    const items = [];
    if (this.inventory.heart > 0) {
      items.push(`
        <button class="powerup-btn" data-type="heart">
          <span class="text-2xl">❤️</span>
          <span class="text-xs">x${this.inventory.heart}</span>
        </button>
      `);
    }
    if (this.inventory.shield > 0) {
      items.push(`
        <button class="powerup-btn" data-type="shield">
          <span class="text-2xl">🛡️</span>
          <span class="text-xs">x${this.inventory.shield}</span>
        </button>
      `);
    }
    if (this.inventory.cookie_boost > 0) {
      items.push(`
        <button class="powerup-btn" data-type="cookie_boost">
          <span class="text-2xl">🍪✨</span>
          <span class="text-xs">x${this.inventory.cookie_boost}</span>
        </button>
      `);
    }
    powerup_panel.innerHTML = items.join('');
    powerup_panel.querySelectorAll('.powerup-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const type = btn.dataset.type;
        if (this.UsePowerup(type)) {
          this.ShowPowerupActivated(type);
        }
      });
    });
  }

  ShowPowerupActivated(type) {
    const names = {
      heart: '❤️ หัวใจพิเศษ',
      shield: '🛡️ โล่ป้องกัน',
      cookie_boost: '🍪✨ คุกกี้ x2'
    };
    const popup = document.createElement('div');
    popup.className =
      'fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500/90 text-white px-6 py-3 rounded-full text-xl font-bold z-50';
    popup.textContent = `${names[type]} เปิดใช้งาน!`;
    document.body.appendChild(popup);
    gsap.fromTo(
      popup,
      { opacity: 0, scale: 0.5 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        onComplete: () => {
          gsap.to(popup, {
            opacity: 0,
            y: -30,
            delay: 1.5,
            duration: 0.5,
            onComplete: () => popup.remove()
          });
        }
      }
    );
  }

  StartCookieBoost(duration = 30000) {
    this.cookie_multiplier = 2;
    if (this.active_powerups.cookie_boost_timer) {
      clearTimeout(this.active_powerups.cookie_boost_timer);
    }
    this.active_powerups.cookie_boost_timer = setTimeout(() => {
      this.cookie_multiplier = 1;
      this.active_powerups.cookie_boost = false;
      this.UpdateActivePowerupsUI();
      this.ShowEffectEnd('🍪 Cookie Boost หมดแล้ว!');
    }, duration);
  }

  StartMagnet(duration = 8000) {
    this.active_powerups.magnet = true;
    this.UpdateActivePowerupsUI();
    this.ShowEffectActivated('🧲 Cookie Magnet!');
    if (this.active_powerups.magnet_timer) {
      clearTimeout(this.active_powerups.magnet_timer);
    }
    this.active_powerups.magnet_timer = setTimeout(() => {
      this.active_powerups.magnet = false;
      this.UpdateActivePowerupsUI();
      this.ShowEffectEnd('🧲 Magnet หมดแล้ว!');
    }, duration);
  }

  StartFever(duration = 10000) {
    this.active_powerups.fever = true;
    this.cookie_multiplier = 2;
    this.UpdateActivePowerupsUI();
    this.ShowEffectActivated('🔥 Cookie Fever x2!');
    if (this.active_powerups.fever_timer) {
      clearTimeout(this.active_powerups.fever_timer);
    }
    this.active_powerups.fever_timer = setTimeout(() => {
      this.active_powerups.fever = false;
      if (!this.active_powerups.cookie_boost) {
        this.cookie_multiplier = 1;
      }
      this.UpdateActivePowerupsUI();
      this.ShowEffectEnd('🔥 Fever หมดแล้ว!');
    }, duration);
  }

  ShowEffectActivated(text) {
    const popup = document.createElement('div');
    popup.className =
      'fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full text-2xl font-bold z-50 shadow-lg';
    popup.textContent = text;
    document.body.appendChild(popup);
    gsap.fromTo(
      popup,
      { opacity: 0, scale: 0.5, y: 20 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'back.out',
        onComplete: () => {
          gsap.to(popup, {
            opacity: 0,
            y: -30,
            delay: 1,
            duration: 0.4,
            onComplete: () => popup.remove()
          });
        }
      }
    );
  }

  ShowEffectEnd(text) {
    const popup = document.createElement('div');
    popup.className =
      'fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-700/90 text-white px-4 py-2 rounded-full text-lg font-bold z-50';
    popup.textContent = text;
    document.body.appendChild(popup);
    gsap.fromTo(
      popup,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.3,
        onComplete: () => {
          gsap.to(popup, {
            opacity: 0,
            delay: 1,
            duration: 0.3,
            onComplete: () => popup.remove()
          });
        }
      }
    );
  }

  UpdateActivePowerupsUI() {
    const active_panel = document.getElementById('active-powerups');
    if (!active_panel) return;
    const items = [];
    if (this.active_powerups.extra_hearts > 0) {
      items.push(
        `<div class="active-buff">❤️ +${this.active_powerups.extra_hearts}</div>`
      );
    }
    if (this.active_powerups.shield > 0) {
      items.push(
        `<div class="active-buff">🛡️ x${this.active_powerups.shield}</div>`
      );
    }
    if (this.active_powerups.cookie_boost) {
      items.push(`<div class="active-buff animate-pulse">🍪✨ x2</div>`);
    }
    if (this.active_powerups.magnet) {
      items.push(`<div class="active-buff magnet-buff">🧲</div>`);
    }
    if (this.active_powerups.fever) {
      items.push(
        `<div class="active-buff fever-buff animate-pulse">🔥 x2</div>`
      );
    }
    active_panel.innerHTML = items.join('');
  }

  ResetPowerups() {
    if (this.active_powerups.cookie_boost_timer) {
      clearTimeout(this.active_powerups.cookie_boost_timer);
    }
    if (this.active_powerups.magnet_timer) {
      clearTimeout(this.active_powerups.magnet_timer);
    }
    if (this.active_powerups.fever_timer) {
      clearTimeout(this.active_powerups.fever_timer);
    }
    this.active_powerups = {
      cookie_boost: false,
      cookie_boost_timer: null,
      shield: 0,
      extra_hearts: 0,
      magnet: false,
      magnet_timer: null,
      fever: false,
      fever_timer: null
    };
    this.cookie_multiplier = 1;
  }

  ShowShieldBlock() {
    const popup = document.createElement('div');
    popup.className =
      'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl z-50';
    popup.textContent = '🛡️';
    document.body.appendChild(popup);
    gsap.fromTo(
      popup,
      { opacity: 1, scale: 0.5 },
      {
        opacity: 0,
        scale: 2,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => popup.remove()
      }
    );
  }

  InitBackgroundElements() {
    this.road_element = document.getElementById('road-scroll');
    this.trees_element = document.getElementById('trees-scroll');
    this.game_container = document.getElementById('game-container');
  }

  InitResizeHandler() {
    let resize_timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resize_timeout);
      resize_timeout = setTimeout(() => {
        if (this.player) {
          this.player.UpdateSize();
          if (!this.player.is_jumping) {
            this.player.y = this.player.ground_y;
            this.player.UpdatePosition();
          }
        }
      }, 100);
    });
  }

  UpdateTotalCookiesUI() {
    const total_element = document.getElementById('total-cookies');
    if (total_element) {
      total_element.textContent = this.total_cookies;
    }
  }

  CheckMoodChange() {
    const distance_since_change =
      this.distance - this.last_mood_change_distance;
    if (distance_since_change >= GAME_CONFIG.MOOD_CHANGE_DISTANCE) {
      this.current_mood_index =
        (this.current_mood_index + 1) % this.mood_list.length;
      this.ChangeMood(this.mood_list[this.current_mood_index]);
      this.last_mood_change_distance = this.distance;
    }
  }

  ChangeMood(mood) {
    if (!this.game_container) return;
    gsap.to(this.game_container, {
      background: mood.sky,
      duration: 2,
      ease: 'power2.inOut'
    });
    this.clouds.forEach(cloud => {
      gsap.to(cloud.element, {
        opacity: mood.cloud_opacity * GameUtils.GetRandomFloat(0.7, 1),
        duration: 1.5
      });
    });
    this.ShowMoodNotification(mood.name);
  }

  ResetMood() {
    if (this.game_container) {
      gsap.set(this.game_container, {
        background: BACKGROUND_MOODS.DAY.sky
      });
    }
  }

  ShowMoodNotification(mood_name) {
    const mood_names = {
      day: '☀️ กลางวัน',
      sunset: '🌅 พระอาทิตย์ตก',
      night: '🌙 กลางคืน',
      dawn: '🌸 รุ่งอรุณ'
    };
    const notification = document.createElement('div');
    notification.className =
      'fixed top-20 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-6 py-3 rounded-full text-xl font-bold z-50';
    notification.textContent = mood_names[mood_name] || mood_name;
    document.body.appendChild(notification);
    gsap.fromTo(
      notification,
      { opacity: 0, y: -20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        onComplete: () => {
          gsap.to(notification, {
            opacity: 0,
            y: -20,
            delay: 1.5,
            duration: 0.5,
            onComplete: () => notification.remove()
          });
        }
      }
    );
  }

  InitTrees() {
    const trees_container = document.getElementById('trees-scroll');
    if (!trees_container) return;
    trees_container.innerHTML = '';
    const screen_width = window.innerWidth;
    const total_width = screen_width * 4;
    const trees_data = [];
    for (let i = 0; i < 40; i++) {
      trees_data.push({
        x: GameUtils.GetRandomInt(0, total_width),
        scale: GameUtils.GetRandomFloat(0.5, 1.4),
        opacity: GameUtils.GetRandomFloat(0.5, 1),
        z: GameUtils.GetRandomInt(1, 10)
      });
    }
    trees_data.sort((a, b) => a.z - b.z);
    for (const data of trees_data) {
      const tree = document.createElement('img');
      tree.src = 'images/tree.png';
      tree.alt = 'tree';
      tree.className = 'tree-item-layered';
      tree.draggable = false;
      tree.style.left = `${data.x}px`;
      tree.style.transform = `scale(${data.scale})`;
      tree.style.opacity = data.opacity;
      tree.style.zIndex = data.z;
      trees_container.appendChild(tree);
    }
  }

  InitElements() {
    this.score_element = document.getElementById('score');
    this.distance_element = document.getElementById('distance');
    this.cookies_element = document.getElementById('cookies');
    this.lives_container = document.getElementById('lives-container');
    this.start_screen = document.getElementById('start-screen');
    this.pause_screen = document.getElementById('pause-screen');
    this.gameover_screen = document.getElementById('gameover-screen');
    this.start_btn = document.getElementById('start-btn');
    this.pause_btn = document.getElementById('pause-btn');
    this.resume_btn = document.getElementById('resume-btn');
    this.restart_btn = document.getElementById('restart-btn');
    this.restart_pause_btn = document.getElementById('restart-pause-btn');
    this.jump_btn = document.getElementById('jump-btn');
    this.slide_btn = document.getElementById('slide-btn');
    const player_element = document.getElementById('player');
    this.player = new Player(player_element);
  }

  RequestFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(() => {});
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  InitEventListeners() {
    this.start_btn.addEventListener('click', () => this.StartGame());
    this.pause_btn.addEventListener('click', () => this.TogglePause());
    this.resume_btn.addEventListener('click', () => this.ResumeGame());
    this.restart_btn.addEventListener('click', () => this.RestartGame());
    this.restart_pause_btn.addEventListener('click', () => this.RestartGame());
    this.jump_btn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.HandleJump();
    });
    this.slide_btn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.HandleSlide();
    });
    this.slide_btn.addEventListener('touchend', e => {
      e.preventDefault();
      this.player.EndSlide();
    });
    document.addEventListener('keydown', e => this.HandleKeyDown(e));
    document.addEventListener('keyup', e => this.HandleKeyUp(e));
    document.getElementById('game-area').addEventListener('touchstart', e => {
      if (this.is_running && !this.is_paused) {
        const touch = e.touches[0];
        const screen_width = window.innerWidth;
        if (touch.clientX < screen_width / 2) {
          this.HandleJump();
        }
      }
    });
    document.addEventListener(
      'touchmove',
      e => {
        if (this.is_running) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  HandleKeyDown(event) {
    if (!this.is_running || this.is_paused) {
      if (event.code === 'Space' || event.code === 'Enter') {
        if (this.start_screen.classList.contains('flex')) {
          this.StartGame();
        } else if (this.gameover_screen.classList.contains('flex')) {
          this.RestartGame();
        } else if (this.is_paused) {
          this.ResumeGame();
        }
      }
      return;
    }
    switch (event.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        this.HandleJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        this.HandleSlide();
        break;
      case 'Escape':
      case 'KeyP':
        this.TogglePause();
        break;
    }
  }

  HandleKeyUp(event) {
    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      this.player.EndSlide();
    }
  }

  HandleJump() {
    if (this.is_running && !this.is_paused) {
      this.player.Jump();
    }
  }

  HandleSlide() {
    if (this.is_running && !this.is_paused) {
      this.player.Slide();
    }
  }

  InitClouds() {
    for (let i = 0; i < 10; i++) {
      const cloud = new Cloud();
      cloud.x = GameUtils.GetRandomInt(0, window.innerWidth);
      cloud.y = GameUtils.GetRandomInt(10, window.innerHeight * 0.35);
      cloud.element.style.left = `${cloud.x}px`;
      cloud.element.style.top = `${cloud.y}px`;
      this.clouds.push(cloud);
    }
  }

  StartGame() {
    this.RequestFullscreen();
    this.is_running = true;
    this.is_paused = false;
    this.score = 0;
    this.distance = 0;
    this.cookies_collected = 0;
    this.lives = GAME_CONFIG.MAX_LIVES + this.active_powerups.extra_hearts;
    this.speed = GAME_CONFIG.INITIAL_SPEED;
    this.road_offset = 0;
    this.current_mood_index = 0;
    this.last_mood_change_distance = 0;
    this.ResetMood();
    if (this.active_powerups.cookie_boost) {
      this.StartCookieBoost();
    }
    this.player.Reset();
    this.ClearGameObjects();
    this.UpdateLives();
    this.UpdateUI();
    this.UpdateActivePowerupsUI();
    this.start_screen.classList.remove('flex');
    this.start_screen.classList.add('hidden');
    this.gameover_screen.classList.remove('flex');
    this.gameover_screen.classList.add('hidden');
    this.last_time = performance.now();
    this.last_obstacle_spawn = this.last_time;
    this.last_collectible_spawn = this.last_time;
    this.last_platform_spawn = this.last_time;
    this.GameLoop();
  }

  TogglePause() {
    if (this.is_running) {
      if (this.is_paused) {
        this.ResumeGame();
      } else {
        this.PauseGame();
      }
    }
  }

  PauseGame() {
    this.is_paused = true;
    this.pause_screen.classList.remove('hidden');
    this.pause_screen.classList.add('flex');
    cancelAnimationFrame(this.animation_frame_id);
  }

  ResumeGame() {
    this.RequestFullscreen();
    this.is_paused = false;
    this.pause_screen.classList.remove('flex');
    this.pause_screen.classList.add('hidden');
    this.last_time = performance.now();
    this.GameLoop();
  }

  RestartGame() {
    this.ResetPowerups();
    this.inventory = this.LoadInventory();
    this.UpdatePowerupUI();
    this.ClearGameObjects();
    this.pause_screen.classList.remove('flex');
    this.pause_screen.classList.add('hidden');
    this.gameover_screen.classList.remove('flex');
    this.gameover_screen.classList.add('hidden');
    this.start_screen.classList.remove('hidden');
    this.start_screen.classList.add('flex');
  }

  GameOver() {
    this.is_running = false;
    cancelAnimationFrame(this.animation_frame_id);
    this.total_cookies += this.cookies_collected;
    this.SaveCookies();
    this.SaveHighScore();
    this.UpdateTotalCookiesUI();
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-distance').textContent = `${Math.floor(
      this.distance
    )}m`;
    document.getElementById('final-cookies').textContent =
      this.cookies_collected;
    document.getElementById('high-score').textContent = this.high_score;
    const earned_element = document.getElementById('earned-cookies');
    if (earned_element) {
      earned_element.textContent = `+${this.cookies_collected}`;
    }
    const gameover_total = document.getElementById('gameover-total-cookies');
    if (gameover_total) {
      gameover_total.textContent = this.total_cookies;
    }
    this.gameover_screen.classList.remove('hidden');
    this.gameover_screen.classList.add('flex');
    this.player.TriggerHitEffect();
  }

  ClearGameObjects() {
    this.obstacles.forEach(o => o.Destroy());
    this.obstacles = [];
    this.collectibles.forEach(c => c.Destroy());
    this.collectibles = [];
    this.platforms.forEach(p => p.Destroy());
    this.platforms = [];
  }

  GameLoop(current_time = performance.now()) {
    if (!this.is_running || this.is_paused) return;
    const delta_time = current_time - this.last_time;
    this.last_time = current_time;
    this.distance += this.speed * 0.1;
    this.score += Math.floor(this.speed * 0.5);
    const distance_milestone = Math.floor(
      this.distance / GAME_CONFIG.SPEED_UP_DISTANCE
    );
    const target_speed = GAME_CONFIG.INITIAL_SPEED + distance_milestone * 0.5;
    if (this.speed < target_speed && this.speed < GAME_CONFIG.MAX_SPEED) {
      this.speed = Math.min(
        GAME_CONFIG.MAX_SPEED,
        this.speed + GAME_CONFIG.SPEED_INCREMENT
      );
    }
    this.SpawnObstacles(current_time);
    this.SpawnCollectibles(current_time);
    this.SpawnClouds(current_time);
    this.player.Update();
    this.UpdateObstacles();
    this.UpdateCollectibles();
    this.UpdatePlatforms();
    this.UpdateClouds();
    this.UpdateBackground();
    this.CheckCollisions();
    this.CheckMoodChange();
    this.UpdateUI();
    this.animation_frame_id = requestAnimationFrame(t => this.GameLoop(t));
  }

  UpdateBackground() {
    if (!this.road_element || !this.trees_element) return;
    const road_img = this.road_element.querySelector('img');
    const road_single_width = road_img ? road_img.offsetWidth : 200;
    this.road_offset -= this.speed * 1.5;
    if (this.road_offset <= -road_single_width) {
      this.road_offset += road_single_width;
    }
    gsap.set(this.road_element, { x: this.road_offset });
    const trees_speed_ratio = this.speed / GAME_CONFIG.MAX_SPEED;
    const trees_animation_speed = 0.3 + trees_speed_ratio * 1.5;
    this.trees_element.style.animationDuration = `${
      20 / trees_animation_speed
    }s`;
  }

  SpawnObstacles(current_time) {
    const spawn_interval = Math.max(
      800,
      GAME_CONFIG.OBSTACLE_SPAWN_RATE - this.speed * 50
    );
    if (current_time - this.last_obstacle_spawn > spawn_interval) {
      const types = Object.values(OBSTACLE_TYPES);
      const type = types[GameUtils.GetRandomInt(0, types.length - 1)];
      let y = ResponsiveHelper.GetGroundY();
      if (type === OBSTACLE_TYPES.FLYING) {
        const flying_y = ResponsiveHelper.GetFlyingObstacleY();
        y = GameUtils.GetRandomInt(flying_y.min, flying_y.max);
      }
      const obstacle = new Obstacle(type, window.innerWidth + 50, y);
      this.obstacles.push(obstacle);
      this.last_obstacle_spawn = current_time;
    }
  }

  SpawnCollectibles(current_time) {
    const spawn_interval = Math.max(
      400,
      GAME_CONFIG.COLLECTIBLE_SPAWN_RATE - this.speed * 20
    );
    if (current_time - this.last_collectible_spawn > spawn_interval) {
      const has_nearby_obstacle = this.obstacles.some(
        obs =>
          obs.x > window.innerWidth - 200 && obs.x < window.innerWidth + 250
      );
      if (has_nearby_obstacle) {
        this.last_collectible_spawn = current_time;
        return;
      }
      const random = Math.random();
      let type;
      if (random < 0.82) {
        type = COLLECTIBLE_TYPES.COOKIE;
      } else if (random < 0.88) {
        type = COLLECTIBLE_TYPES.GOLDEN_COOKIE;
      } else if (random < 0.92) {
        type = COLLECTIBLE_TYPES.MAGNET;
      } else if (random < 0.96) {
        type = COLLECTIBLE_TYPES.FEVER;
      } else if (
        this.lives <
        GAME_CONFIG.MAX_LIVES + this.active_powerups.extra_hearts
      ) {
        type = COLLECTIBLE_TYPES.HEART;
      } else {
        type = COLLECTIBLE_TYPES.GOLDEN_COOKIE;
      }
      const collectible_y = ResponsiveHelper.GetCollectibleY();
      const y = GameUtils.GetRandomInt(collectible_y.min, collectible_y.max);
      const collectible = new Collectible(type, window.innerWidth + 50, y);
      this.collectibles.push(collectible);
      if (Math.random() > 0.5) {
        const count = GameUtils.GetRandomInt(2, 4);
        for (let i = 1; i < count; i++) {
          const extra = new Collectible(
            COLLECTIBLE_TYPES.COOKIE,
            window.innerWidth + 50 + i * 40,
            y
          );
          this.collectibles.push(extra);
        }
      }
      this.last_collectible_spawn = current_time;
    }
  }

  SpawnClouds(current_time) {
    if (current_time - this.last_cloud_spawn > 2000) {
      if (this.clouds.length < 15) {
        this.clouds.push(new Cloud());
      }
      this.last_cloud_spawn = current_time;
    }
  }

  UpdateObstacles() {
    this.obstacles = this.obstacles.filter(obstacle => {
      if (obstacle.is_active) {
        obstacle.Update(this.speed);
        return true;
      }
      return false;
    });
  }

  UpdateCollectibles() {
    const player_hitbox = this.player.GetHitbox();
    const magnet_range = 200;
    this.collectibles = this.collectibles.filter(collectible => {
      if (collectible.is_active) {
        if (
          this.active_powerups.magnet &&
          collectible.type !== COLLECTIBLE_TYPES.HEART
        ) {
          const dx = player_hitbox.x - collectible.x;
          const dy = player_hitbox.y + player_hitbox.height / 2 - collectible.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < magnet_range) {
            const pull_speed = 8;
            collectible.x += (dx / distance) * pull_speed;
            collectible.y += (dy / distance) * pull_speed;
            gsap.set(collectible.element, {
              left: collectible.x,
              bottom: collectible.y
            });
          }
        }
        collectible.Update(this.speed);
        return true;
      }
      return false;
    });
  }

  UpdatePlatforms() {
    this.platforms = this.platforms.filter(platform => {
      if (platform.is_active) {
        platform.Update(this.speed);
        return true;
      }
      return false;
    });
  }

  UpdateClouds() {
    this.clouds = this.clouds.filter(cloud => {
      if (cloud.is_active) {
        cloud.Update();
        return true;
      }
      return false;
    });
  }

  CheckCollisions() {
    const player_hitbox = this.player.GetHitbox();
    for (const obstacle of this.obstacles) {
      if (!obstacle.is_active) continue;
      const obstacle_hitbox = obstacle.GetHitbox();
      if (obstacle.type === OBSTACLE_TYPES.FLYING && this.player.is_sliding) {
        continue;
      }
      if (GameUtils.CheckCollision(player_hitbox, obstacle_hitbox)) {
        if (!this.player.is_invincible) {
          this.TakeDamage();
          obstacle.Destroy();
          return;
        }
      }
    }
    for (const collectible of this.collectibles) {
      if (!collectible.is_active) continue;
      const collectible_hitbox = collectible.GetHitbox();
      if (GameUtils.CheckCollision(player_hitbox, collectible_hitbox)) {
        const points = collectible.Collect();
        this.score += points;
        this.player.TriggerCollectGlow(collectible.type);
        switch (collectible.type) {
          case COLLECTIBLE_TYPES.HEART:
            const max_lives =
              GAME_CONFIG.MAX_LIVES + this.active_powerups.extra_hearts;
            if (this.lives < max_lives) {
              this.lives++;
              this.UpdateLives();
              this.CreateHeartPopup();
            }
            break;
          case COLLECTIBLE_TYPES.GOLDEN_COOKIE:
            const golden_amount = 5 * this.cookie_multiplier;
            this.cookies_collected += golden_amount;
            this.CreateCookiePopup(golden_amount, '🍪✨');
            break;
          case COLLECTIBLE_TYPES.MAGNET:
            this.StartMagnet(8000);
            this.cookies_collected += this.cookie_multiplier;
            break;
          case COLLECTIBLE_TYPES.FEVER:
            this.StartFever(10000);
            this.cookies_collected += this.cookie_multiplier;
            break;
          case COLLECTIBLE_TYPES.COOKIE:
          default:
            this.cookies_collected += this.cookie_multiplier;
            break;
        }
      }
    }
  }

  CreateCookiePopup(amount, icon = '🍪') {
    const popup = document.createElement('div');
    popup.className =
      'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold z-50';
    popup.innerHTML = `${icon} +${amount}`;
    popup.style.color = '#fbbf24';
    popup.style.textShadow = '0 2px 10px rgba(251, 191, 36, 0.8)';
    document.body.appendChild(popup);
    gsap.fromTo(
      popup,
      { opacity: 1, scale: 0.5, y: 0 },
      {
        opacity: 0,
        scale: 1.5,
        y: -50,
        duration: 1,
        ease: 'power2.out',
        onComplete: () => popup.remove()
      }
    );
  }

  CreateHeartPopup() {
    const popup = document.createElement('div');
    popup.className =
      'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl z-50';
    popup.textContent = '❤️ +1';
    popup.style.color = '#ef4444';
    popup.style.textShadow = '0 2px 10px rgba(239, 68, 68, 0.8)';
    document.body.appendChild(popup);

    gsap.fromTo(
      popup,
      { opacity: 1, scale: 0.5, y: 0 },
      {
        opacity: 0,
        scale: 1.5,
        y: -50,
        duration: 1,
        ease: 'power2.out',
        onComplete: () => popup.remove()
      }
    );
  }

  UpdateUI() {
    this.score_element.textContent = this.score;
    this.distance_element.textContent = `${Math.floor(this.distance)}m`;
    this.cookies_element.textContent = this.cookies_collected;
  }

  UpdateLives() {
    const hearts = this.lives_container.querySelectorAll('.heart');
    hearts.forEach((heart, index) => {
      if (index < this.lives) {
        heart.textContent = '❤️';
        heart.classList.remove('opacity-30');
        gsap.set(heart, { scale: 1 });
      } else {
        heart.textContent = '🖤';
        heart.classList.add('opacity-30');
        gsap.to(heart, { scale: 0.8, duration: 0.3, ease: 'back.out' });
      }
    });
  }

  TakeDamage() {
    if (this.active_powerups.shield > 0) {
      this.active_powerups.shield--;
      this.UpdateActivePowerupsUI();
      this.ShowShieldBlock();
      this.player.SetInvincible(500);
      return;
    }
    this.lives--;
    const lost_heart =
      this.lives_container.querySelectorAll('.heart')[this.lives];
    if (lost_heart) {
      gsap.to(lost_heart, {
        scale: 1.5,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        onComplete: () => this.UpdateLives()
      });
    } else {
      this.UpdateLives();
    }
    this.player.TriggerHitEffect();
    const game_container = document.getElementById('game-container');
    gsap.to(game_container, {
      x: 5,
      duration: 0.05,
      repeat: 5,
      yoyo: true,
      ease: 'power2.inOut',
      onComplete: () => gsap.set(game_container, { x: 0 })
    });
    if (this.lives <= 0) {
      this.GameOver();
    } else {
      this.player.SetInvincible(GAME_CONFIG.INVINCIBILITY_DURATION);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new GameManager();
  window.CookieRunnerGame = game;
  console.log('🍪 Cookie Runner initialized!');
  console.log('Controls: Space/Up Arrow = Jump, Down Arrow = Slide');
});
