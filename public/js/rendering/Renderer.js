import {drawPixelPlayer} from './pixelPlayer.js'

export class Renderer {
  constructor(canvas, blurCanvas) {
    this.canvas = canvas;
    this.blurCanvas = blurCanvas;
    this.ctx = canvas.getContext('2d');
    this.blurCtx = blurCanvas.getContext('2d');
    this.crtCanvas = document.createElement('canvas');
    this.crtCanvas.width = this.canvas.width;
    this.crtCanvas.height = this.canvas.height;
    this.crtCtx = this.crtCanvas.getContext('2d', { alpha: false });
    
    // Pre-create the gradient for vignette
    this.vignetteGradient = this.ctx.createRadialGradient(
        this.canvas.width/2, this.canvas.height/2, 0,
        this.canvas.width/2, this.canvas.height/2, this.canvas.width/1.5
    );
    this.vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
    this.vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
  }

  drawBackground() {
    this.bgImg = new Image();
    this.bgImg.src = "/assets/rooms/room1.png";
  // Draw the background image scaled to fit the canvas
    this.ctx.drawImage(
      this.bgImg,
      this.canvas.width,
      this.canvas.height,
      this.canvas.width,
      this.canvas.height
    );
    
  }

    applyCRTEffect() {
      // Simple wave effect using pre-created temp canvas
      const time = Date.now() / 1000;
      const waveAmount = Math.sin(time) * 1.5;
      
      this.crtCtx.drawImage(this.canvas, 
          0, 0, this.canvas.width, this.canvas.height,
          waveAmount, 0, this.canvas.width, this.canvas.height
      );
      
      this.ctx.drawImage(this.crtCanvas, 0, 0);

      // Scanlines - only every 4th line
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.17)';
      for(let i = 0; i < this.canvas.height; i += 4) {
          this.ctx.fillRect(0, i, this.canvas.width, 1);
      }

      // Subtle color shift
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.02)';
      this.ctx.fillRect(1, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = 'rgba(0, 255, 0, 0.02)';
      this.ctx.fillRect(-1, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';

      // Pre-created vignette
      this.ctx.fillStyle = this.vignetteGradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Minimal noise
      if(Math.random() < 0.02) {
          this.ctx.fillStyle = 'rgba(255,255,255,0.015)';
          for(let i = 0; i < 8; i++) {
              this.ctx.fillRect(
                  Math.random() * this.canvas.width,
                  Math.random() * this.canvas.height,
                  2, 2
              );
          }
      }
  }

  drawMotionBlur(player) {
    this.blurCtx.clearRect(0, 0, this.blurCanvas.width, this.blurCanvas.height);

    if (player.isDashing) {
      const startX = player.trailPositions[player.trailPositions.length - 1]?.x || player.x;
      const startY = player.trailPositions[player.trailPositions.length - 1]?.y || player.y;
      const gradient = this.blurCtx.createLinearGradient(startX, startY, player.x, player.y);

      gradient.addColorStop(0, 'rgba(68, 136, 255, 0)');
      gradient.addColorStop(0.5, 'rgba(68, 136, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(68, 136, 255, 0.6)');

      this.blurCtx.beginPath();
      this.blurCtx.moveTo(startX, startY);

      if (player.trailPositions.length > 1) {
        for (let i = player.trailPositions.length - 2; i >= 0; i--) {
          const pos = player.trailPositions[i];
          this.blurCtx.lineTo(pos.x, pos.y);
        }
      }

      this.blurCtx.lineTo(player.x, player.y);
      this.blurCtx.lineWidth = player.radius * 2;
      this.blurCtx.strokeStyle = gradient;
      this.blurCtx.lineCap = 'round';
      this.blurCtx.lineJoin = 'round';
      this.blurCtx.stroke();

      player.trailPositions.forEach((pos, index) => {
        const alpha = (1 - index / player.trailPositions.length) * 0.4;
        this.blurCtx.beginPath();

        this.blurCtx.arc(pos.x, pos.y, player.radius * 1.2, 0, Math.PI * 2);
        this.blurCtx.fillStyle = `rgba(68, 136, 255, ${alpha})`;
        this.blurCtx.fill();
      });
    } else if (Math.abs(player.dx) > 3 || Math.abs(player.dy) > 3) {
      player.trailPositions.forEach((pos, index) => {
        const alpha = (1 - index / player.trailPositions.length) * 0.2;
        this.blurCtx.beginPath();
        this.blurCtx.arc(pos.x, pos.y, player.radius, 0, Math.PI * 2);
        this.blurCtx.fillStyle = `rgba(68, 136, 255, ${alpha})`;
        this.blurCtx.fill();
      });
    }
  }

  render(player, room, mouseX, mouseY) {
    let enemies = room.enemies;
    let projectiles = room.projectiles;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.bgImg = room.imageRef;
    //console.log(room.imageRef);

    // Draw background first if loaded
    this.ctx.drawImage(this.bgImg, 0, 0, this.canvas.width, this.canvas.height);

    // Determine player color
    let color = '#4488ff'; // Default blue color
    if (player.isInvulnerable) {
      color = Math.floor(Date.now() / 100) % 2 === 0 ? (player.canDash ? '#4488ff' : "#85b1ff") : '#ff4444';
    } else if (!player.canDash) {
      color = "#85b1ff";
    }
    let lasers = room.lasers;
    if (lasers && lasers.length > 0) {
      lasers.forEach(laser => {
          if (!((Date.now() - laser.fireTime) > laser.delay)) {
            return;
          }
          const laserLength = 10000; // Length of the laser line
          const endX = laser.x + Math.cos(laser.angle) * laserLength;
          const endY = laser.y + Math.sin(laser.angle) * laserLength;

          this.ctx.beginPath();
          this.ctx.moveTo(laser.x, laser.y);
          this.ctx.lineTo(endX, endY);
          this.ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - (Date.now() - laser.fireTime) / laser.remainTime) + ')'
          this.ctx.lineWidth = 10; // Thickness of the laser line
          this.ctx.stroke();
      });
  }

    // Draw the pixelated player
    drawPixelPlayer(this.ctx, player.x, player.y, 42, color);
    this.drawMotionBlur(player);
    

    // Draw direction arrow
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    const arrowLength = 40;
    this.ctx.beginPath();
    this.ctx.moveTo(player.x, player.y);
    this.ctx.lineTo(
      player.x + Math.cos(angle) * arrowLength,
      player.y + Math.sin(angle) * arrowLength
    );
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (player.double) {
      this.ctx.lineTo(
        player.x + Math.cos(angle + Math.PI) * arrowLength,
        player.y + Math.sin(angle+ Math.PI) * arrowLength
      );

      this.ctx.stroke();
    }

    // Add null check for enemies
    if (enemies && enemies.length > 0) {
      enemies.forEach(enemy => {
        if (enemy.isActive) {
          drawPixelPlayer(this.ctx, enemy.x, enemy.y, (enemy.radius / 20) * 42, enemy.color);
    
          // Draw shield if enemy is shielded type
          if (enemy.type === 'shielded' && enemy.shieldActive) {
            this.ctx.beginPath();
            this.ctx.arc(
              enemy.x,
              enemy.y,
              enemy.radius + 10, // Slightly larger than enemy radius
              enemy.shieldAngle - enemy.shieldArc / 2,
              enemy.shieldAngle + enemy.shieldArc / 2
            );
            this.ctx.lineWidth = 5;
            this.ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)'; // Light blue semi-transparent
            this.ctx.stroke();
    
            // Add shield glow effect
            this.ctx.beginPath();
            this.ctx.arc(
              enemy.x,
              enemy.y,
              enemy.radius + 10,
              enemy.shieldAngle - enemy.shieldArc / 2,
              enemy.shieldAngle + enemy.shieldArc / 2
            );
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)'; // Brighter blue for glow
            this.ctx.stroke();
          }
    
          // Draw health bar
          this.ctx.fillStyle = 'red';
          this.ctx.fillRect(enemy.x - 25, enemy.y - enemy.radius - 10, 50, 5);
          this.ctx.fillStyle = 'green';
          this.ctx.fillRect(enemy.x - 25, enemy.y - enemy.radius - 10, (enemy.health / enemy.maxHealth) * 50, 5);
        }
      });
    }

    // Add null check for projectiles
    if (projectiles && projectiles.length > 0) {
      projectiles.forEach(proj => {
        this.ctx.beginPath();
        
        const bounceColor = 255 - (proj.bounces * 60);
        let fullColour = `rgb(255, ${bounceColor}, ${bounceColor})`;
        drawPixelPlayer(this.ctx, proj.x, proj.y, proj.radius*2 , fullColour);
        this.ctx.fill();
      });
    }

    // Draw coins with debug logging
    if (room.coins && room.coins.length > 0) {
        room.coins.forEach(coin => {
            this.ctx.beginPath();
            this.ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = coin.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    // Draw keys
    if (room.keys && room.keys.length > 0) {
        room.keys.forEach(key => {
            this.ctx.beginPath();
            this.ctx.arc(key.x, key.y, key.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = key.color;
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    if (room.health && room.health.length > 0) {
      room.health.forEach(healing => {
          this.ctx.beginPath();
          this.ctx.arc(healing.x, healing.y, healing.radius, 0, Math.PI * 2);
          this.ctx.fillStyle = healing.color;
          this.ctx.fill();
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
      });
  }
    // Render cards in shop
    if (room.type == "shop") {
      const renderCard = (x, powerUp, bought) => {
        if (bought) return;

        // Parchment background with texture
        this.ctx.fillStyle = "#d4c391";
        this.ctx.fillRect(x, 35, 140, 200);

        // Add parchment texture/grain effect (less noisy)
        this.ctx.globalAlpha = 0.1;
        for (let i = 0; i < 200; i += 6) {
          for (let j = 0; j < 140; j += 6) {
            if (Math.random() > 0.7) {
              this.ctx.fillStyle = "#b5a47c";
              this.ctx.fillRect(x + j, 35 + i, 3, 3);
            }
          }
        }
        this.ctx.globalAlpha = 1.0;

        // Aged border effect
        this.ctx.strokeStyle = "#8b7355";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x + 5, 40, 130, 190);

        // Title banner
        this.ctx.fillStyle = "#8b7355"; // Darker banner
        this.ctx.fillRect(x + 10, 45, 120, 40);

        // Title text with clear and readable font
        this.ctx.fillStyle = "#ffd700";
        this.ctx.font = "bold 18px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(powerUp[2], x + 70, 70);

        // Description background for better readability
        this.ctx.fillStyle = "#f0e6d2"; // Light background for text
        this.ctx.fillRect(x + 10, 90, 120, 80);

        // Description text with better contrast
        this.ctx.font = "16px Arial";
        this.ctx.fillStyle = "#4a3f2f";
        this.ctx.textAlign = "left";

        // Word wrapping for description
        let words = powerUp[3].split(" ");
        let line = "";
        let y = 110;
        let maxWidth = 110;

        for (const word of words) {
          let testLine = line + word + " ";
          let metrics = this.ctx.measureText(testLine);
          if (metrics.width > maxWidth) {
            this.ctx.fillText(line, x + 15, y); // Adjusted for padding
            line = word + " ";
            y += 18; // Increased line spacing
          } else {
            line = testLine;
          }
        }
        this.ctx.fillText(line, x + 15, y);

        // Cost section with clearer background
        this.ctx.fillStyle = "#8b7355"; // Dark background
        this.ctx.fillRect(x + 20, 190, 100, 30);

        // Pixelated coin icon
        this.ctx.fillStyle = "#ffd700";
        const coinX = x + 30;
        const coinY = 195;
        this.ctx.fillRect(coinX, coinY + 5, 10, 10);
        this.ctx.fillStyle = "#ffed4a";
        this.ctx.fillRect(coinX + 2, coinY + 7, 6, 6);

        // Cost text with readable font and spacing
        this.ctx.font = "bold 18px Arial";
        this.ctx.fillStyle = "#ffd700";
        this.ctx.textAlign = "center";
        this.ctx.fillText(powerUp[1], x + 70, 210);
      };

      // Render both cards with updated rendering
      renderCard(150, room.powerUps[0], room.bought[0]);
      renderCard(350, room.powerUps[1], room.bought[1]);
    }

    const drawPartialDoor = (x, y, width, height, progress) => {
      // Red background
      this.ctx.fillStyle = 'red';
      this.ctx.fillRect(x, y, width, height);

      progress = Math.min(progress, 1)
      
      // Green progress
      this.ctx.fillStyle = 'green';
      if (width > height) { // horizontal door
        const fillWidth = width * progress;
        this.ctx.fillRect(x, y, fillWidth, height);
      } else { // vertical door
        const fillHeight = height * progress;
        this.ctx.fillRect(x, y, width, fillHeight);
      }
    };

    if (room.travel.up.type=='door') {
      const progress = room.travel.up.openreq == 0 || room.travel.up.open ? 1 : room.travel.up.shotcount / room.travel.up.openreq;
      drawPartialDoor(260, 0, 80, 20, progress);
    } else if (room.travel.up.type=='key') {
      this.ctx.fillStyle = 'yellow';
      this.ctx.fillRect(260, 0, 80, 20);
    }

    if (room.travel.down.type=='door') {
      const progress = room.travel.down.openreq == 0 || room.travel.down  .open ? 1 : room.travel.down.shotcount / room.travel.down.openreq;
      drawPartialDoor(260, 580, 80, 20, progress);
    } else if (room.travel.down.type=='key') {
      this.ctx.fillStyle = 'yellow';
      this.ctx.fillRect(260, 580, 80, 20);
    }

    if (room.travel.left.type=='door') {
      const progress = room.travel.left.openreq == 0 || room.travel.left.open  ? 1 : room.travel.left.shotcount / room.travel.left.openreq;
      drawPartialDoor(0, 260, 20, 80, progress);
    } else if (room.travel.left.type=='key') {
      this.ctx.fillStyle = 'yellow';
      this.ctx.fillRect(0, 260, 20, 80);
    }

    if (room.travel.right.type=='door') {
      const progress = room.travel.right.openreq == 0 || room.travel.right.open ? 1 : room.travel.right.shotcount / room.travel.right.openreq;
      drawPartialDoor(580, 260, 20, 80, progress);
    } else if (room.travel.right.type=='key') {
      this.ctx.fillStyle = 'yellow';
      this.ctx.fillRect(580, 260, 20, 80);
    }

    this.applyCRTEffect();
  }
  
}
