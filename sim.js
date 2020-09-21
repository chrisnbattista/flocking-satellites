//import Phaser from 'phaser';

// Configuration Variables
// For a larger project, these should be contained in a 
// configuration file or database.
const NUM_SATS = 10;
const INITIAL_FORMATION_RADIUS = 130;

const WINDOW_WIDTH = 1490;
const WINDOW_HEIGHT = 745;

var config = {
    type: Phaser.AUTO,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload ()
{
    this.load.image('satellite', 'assets/satellite.png');
    this.load.image('earth', 'assets/earth.png');
}

function create ()
{
    this.add.image(WINDOW_WIDTH/2, WINDOW_HEIGHT/2, 'earth');

    this.satellites = this.add.group();
    this.sat_list = null;
    this.earth = null;

    var new_sat;
    for (i=0; i<NUM_SATS; i++) {
        new_sat = this.add.sprite(
            800 + INITIAL_FORMATION_RADIUS * Math.sin(i * 2 * Math.PI / (1.0 * NUM_SATS)),
            400 + INITIAL_FORMATION_RADIUS * Math.cos(i * 2 * Math.PI / (1.0 * NUM_SATS)),
            'satellite'
        )
        new_sat.displayHeight = 60;
        new_sat.displayWidth = 42;
        new_sat.rotVel = (Math.random() - 0.5) * 0.1;
        this.satellites.add(new_sat);
    }

    this.graphics = this.add.graphics();
    this.orbit_line = new Phaser.Curves.Path(
        0, WINDOW_HEIGHT/2);
    this.orbit_line.lineTo(WINDOW_WIDTH, WINDOW_HEIGHT/2)

    this.lead_circle = new Phaser.Geom.Circle()
    this.lead_circle.radius = 30;
}

function update ()
{
    // Update simulation dynamics
    // The graphics engine draws these automatically
    sat_list = this.satellites.getChildren();
    for (i=0; i<NUM_SATS; i++) {
        sat_list[i].angle += sat_list[i].rotVel;
        sat_list[i].x += 0.1;
        if (sat_list[i].x > WINDOW_WIDTH) {
            sat_list[i].x -= WINDOW_WIDTH;
        }
    }

    // Update indicators
    this.lead_circle.x = sat_list[0].x;
    this.lead_circle.y = sat_list[0].y;

    // Draw indicators
    this.graphics.clear();
    this.graphics.lineStyle(0.5, 0x66FF00);
    this.orbit_line.draw(this.graphics);
    this.graphics.strokeCircleShape(this.lead_circle);
}