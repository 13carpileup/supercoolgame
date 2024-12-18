// Enemy.js
import { CANVAS } from '../constants.js';
import { Projectile } from './Projectile.js';

// Base Enemy class
export class Enemy {
    constructor(x, y, id, key=false, healing=false, radius=20, health=100) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        //console.log("radius:-----",radius)
        this.speed = 1.7;
        this.health = health;
        this.maxHealth = health;
        this.type = 'regular';
        this.isActive = true;
        this.color = key ? '#f5c542' : '#ff0000';
        this.minDistanceFromPlayer = this.radius * 1.5; // Minimum distance to maintain from player
        this.coinDrop = {
            type: 'bronze',
            value: 1
        };
        this.hasKey = key;
        this.healing = healing
        this.id = id;
    }

    update(player) {
        if (!this.isActive) return;

        // Calculate distance to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Only move if we're further than the minimum distance
        if (distance > this.minDistanceFromPlayer) {
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        } else if (distance < this.minDistanceFromPlayer - 5) {
            // Move away if too close
            this.x -= Math.cos(angle) * this.speed;
            this.y -= Math.sin(angle) * this.speed;
        }

        // Keep enemy within canvas bounds
        this.x = Math.max(this.radius, Math.min(CANVAS.WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CANVAS.HEIGHT - this.radius, this.y));
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.isActive = false;
            console.log('Enemy died, dropping coin:', this.coinDrop);
        }
    }

    checkCollision(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + player.radius;
    }
}



// Attacker Enemy
export class AttackerEnemy extends Enemy {
    constructor(x, y, id, key, healing, radius, health) {
        super(x, y, id, key, healing, radius, health);
        this.type = 'attacker';
        this.color = key ? '#f5c542' : '#ff00ff';
        this.attackCooldown = 1900 + Math.random() * 200; // ms
        this.lastAttack = 0;
        this.minDistanceFromPlayer = this.radius * 12; // Increased distance for attacker
        this.projectileSpeed = 6; // Projectile speed
        this.coinDrop = {
            type: 'silver',
            value: 2
        };
    }

    update(player, gameTime) {
        super.update(player);

        // Attack logic
        if (gameTime - this.lastAttack >= this.attackCooldown) {
            this.lastAttack = gameTime;
            return this.attack(player);
        }
        return null;
    }

    attack(player) {
        // Calculate angle to player for accurate shooting
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const projectile = new Projectile(this.x, this.y, angle, this.projectileSpeed, 10);
        projectile.isEnemyProjectile = true; // Mark as enemy projectile
        return projectile;
    }
}

// Shielded Enemy
export class ShieldedEnemy extends Enemy {
    constructor(x, y, id, key, healing, radius, health) {
        super(x, y, id, key, healing, radius, health);
        this.type = 'shielded';
        this.color = key ? '#f5c542' : '#00ff00';
        this.shieldActive = true;
        this.shieldAngle = 0; // Shield facing angle
        this.shieldArc = Math.PI / 4; // Shield covers 90 degrees
        this.attackCooldown = 1900 + Math.random() * 200; // ms
        this.projectileSpeed = 6; // Projectile speed
        this.minDistanceFromPlayer = this.radius * 10; // Increased distance for attacker
        this.lastAttack = 0;
        this.maxHealth = 60;
        this.health = 60;
        this.coinDrop = {
            type: 'gold',
            value: 5
        };
    }

    update(player, gameTime) {
        super.update(player);
        // Update shield angle to face player
        this.shieldAngle = Math.atan2(player.y - this.y, player.x - this.x);

        if (gameTime - this.lastAttack >= this.attackCooldown) {
            this.lastAttack = gameTime;
            return this.attack(player);
        }
        //console.log("shield: ", this.shieldAngle);
    }

    checkBulletCollision(projectile) {
        const angle = Math.atan2(
            projectile.y - this.y,
            projectile.x - this.x
        );

        if (Math.abs(angle - this.shieldAngle) <= (this.shieldArc / 2)) {
            //console.log("REFLECT");
            return 1;
        }

        //console.log("NO REFLECT")

        return 0;

        //console.log("bullet: ", angle);
        // Implement shield logic here
        // Return true if bullet should bounce, false if it should hit
    }


    attack(player) {
        // Calculate angle to player for accurate shooting
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const projectile = new Projectile(this.x, this.y, angle, this.projectileSpeed, 10);
        projectile.isEnemyProjectile = true; // Mark as enemy projectile
        return projectile;
    }
}

// Reflector Enemy
export class ReflectorEnemy extends ShieldedEnemy {
    constructor(x, y, id, key, healing, radius, health) {
        super(x, y, id, key, healing, radius, health);
        this.type = 'reflector';
        this.color = key ? '#f5c542' : '#0000ff';
        this.coinDrop = {
            type: 'gold',
            value: 5
        };
    }

    reflectBullet(projectile) {
        // Implement bullet reflection logic
        return new Projectile(this.x, this.y, Math.PI + projectile.angle, projectile.speed);
    }
}

// Laser Enemy
export class LaserEnemy extends Enemy {
    constructor(x, y, id, key, healing, radius, health) {
        super(x, y, id, key, healing, radius, health);
        this.type = 'laser';
        this.color = key ? '#f5c542' : '#9c19ff';
        this.isCharging = false;
        this.chargeTime = 300; // ms
        this.cooldown = 2500;
        this.lastShot = 0;
        this.fired = 0;
        this.chargeStart = 0;
        this.laserWidth = 5;
        this.laserTime = 2000;
        this.health = 150;
        this.maxHealth = 150;
        this.coinDrop = {
            type: 'gold',
            value: 5
        };
        this.minDistanceFromPlayer = this.radius * 12; // Increased distance for attacker
    }

    update(player, gameTime) {
        if (!this.fired) {
            this.fired = 1;
            this.lastShot = gameTime - 2500;
        }
        super.update(player);
        if ((gameTime - this.lastShot) >= this.cooldown ) {
            this.lastShot = gameTime;
            return this.fireLaser(player, gameTime);
        } 
        return null;
    }

    fireLaser(player, gameTime) {
        const angle = Math.atan2(
            player.y - this.y,
            player.x - this.x
        );

        return {
            x: this.x,
            y: this.y,
            angle: angle,
            fireTime: gameTime,
            remainTime: this.laserTime,
            delay: this.chargeTime,
            sound: 0,
        }
    }

}

// Enemy Factory
export class EnemyFactory {
    static createEnemy(type, x, y, id, key=false, healing=false, radius = 20, health=100) {
        //console.log(healing);
        switch(type.toLowerCase()) {
            case 'regular':
                return new Enemy(x, y, id, key, healing, radius, health);
            case 'shielded':
                return new ShieldedEnemy(x, y, id, key, healing, radius, health);
            case 'reflector':
                return new ReflectorEnemy(x, y, id, key, healing, radius, health);
            case 'attacker':
                return new AttackerEnemy(x, y, id, key, healing, radius, health);
            case 'laser':
                return new LaserEnemy(x, y, id, key, healing, radius, health);
            default:
                return new Enemy(x, y, id, key, healing, radius, health);
        }
    }
}
