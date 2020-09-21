import Phaser from 'phaser';

// Configuration variables
// For a larger project, these should be contained in a 
// configuration file or database.
const NUM_SATS = 16;
const INITIAL_FORMATION_RADIUS = 130;
const NEIGHBOR_RADIUS = 100;
const AVOID_RADIUS = NEIGHBOR_RADIUS * 0.7;

const WINDOW_WIDTH = 1490;
const WINDOW_HEIGHT = 745;

var config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'phaser-example',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Utility functions
function f_norm(sprite1, sprite2) {
    'Calculates the Frobenious norm between two sprites'
    return Math.sqrt(
        (sprite1.x - sprite2.x)**2
        +
        (sprite1.y - sprite2.y)**2
    );
}

function average(array) {
    var sum = 0;
    for(var i = 0; i < array.length;i++){
        sum += array[i];
    }
    return sum / array.length;
}

const col_slice = (arr, n) => arr.map(x => x[n]);

var game = new Phaser.Game(config);

function preload ()
{
    this.load.image('satellite', 'assets/satellite.png');
    this.load.image('earth', 'assets/earth.png');
}

function create ()
{
    this.add.image(this.scale.width/2, this.scale.height/2, 'earth');

    this.satellites = this.add.group();
    this.sat_list = null;
    this.earth = null;

    var new_sat;
    for (var i=0; i<NUM_SATS; i++) {
        new_sat = this.add.sprite(
            this.scale.width/2 + INITIAL_FORMATION_RADIUS * Math.cos(i * 2 * Math.PI / (1.0 * NUM_SATS)),
            this.scale.height/2 + INITIAL_FORMATION_RADIUS * Math.sin(i * 2 * Math.PI / (1.0 * NUM_SATS)),
            'satellite'
        )
        new_sat.displayHeight = this.scale.height/20;
        new_sat.displayWidth = new_sat.displayHeight * 1.1;
        new_sat.rotVel = (Math.random() - 0.5) * 0.1;
        new_sat.setDepth(1);
        this.satellites.add(new_sat);
    }

    this.graphics = this.add.graphics();
    this.orbit_line = new Phaser.Curves.Path(
        0, this.scale.height/2);
    this.orbit_line.lineTo(this.scale.width, this.scale.height/2)

    this.link_line = new Phaser.Geom.Line(0, 0, 0, 0);
    this.avoid_line = new Phaser.Geom.Line(0, 0, 0, 0);

    this.lead_circle = new Phaser.Geom.Circle()
    this.lead_circle.radius = 30;
}

function update ()
{

    this.link_line_list = [];
    this.avoid_line_list = [];

    // Update simulation dynamics
    // The graphics engine draws these automatically
    var sat_list = this.satellites.getChildren();
    for (var i=0; i<NUM_SATS; i++) {

        // Own motion
        // This section of the code ensures the satellites
        // are maintaining a baseline orbit velocity
        // independent of other satellites. It also assigns
        // a baseline spin.
        sat_list[i].x += 0.1;
        sat_list[i].angle += sat_list[i].rotVel;
        sat_list[i].x += 0.05 * Math.cos(sat_list[i].angle);
        sat_list[i].y += 0.05 * Math.sin(sat_list[i].angle);

        // Flocking dynamics
        if (i != 0) { // skip the leader satellite, it only concerns
                        // itself with its own orbit

            for (var j=0; j<NUM_SATS; j++) {

                // find neighbors to move towards, and obstacles to avoid
                var neighbor_locs = [];
                var avoid_locs = [];
                var distance;
                if (j != i) { // don't interact with yourself

                    distance = f_norm(sat_list[i], sat_list[j]);

                    if (distance < NEIGHBOR_RADIUS) {

                        if (distance > AVOID_RADIUS) {
                            // Cohesion (element #1 of flocking algorithm)
                            // This section adds an attractor that causes satellites 
                            // to move towards others near them

                            // Record as neighbor
                            neighbor_locs.push([sat_list[j].x, sat_list[j].y]);

                            // Queue indicator
                            this.link_line_list.push([sat_list[i].x, sat_list[i].y,
                                                sat_list[j].x, sat_list[j].y]);
                        } else {
                            // Separation (element #2 of flocking algorithm)
                            // Step change to avoidance behavior if the neighbor
                            // gets too close.

                            // Record as obstacle
                            avoid_locs.push([sat_list[j].x, sat_list[j].y]);

                            // Queue indicator
                            this.avoid_line_list.push([sat_list[i].x, sat_list[i].y,
                                sat_list[j].x, sat_list[j].y]);
                        }
                    }
                }

                // steer towards neighbors
                var steer_direction =
                    // (new Phaser.Math.Vector2(
                    //     average(col_slice(neighbor_locs, 0)) - sat_list[i].x,
                    //     average(col_slice(neighbor_locs, 1)) - sat_list[i].y
                    // ).normalize().scale(0.1).add(
                        new Phaser.Math.Vector2(
                            -(average(col_slice(avoid_locs, 0)) - sat_list[i].x),
                            -(average(col_slice(avoid_locs, 1)) - sat_list[i].y)
                        ).normalize()
                    //)
                //).normalize()


                // apply thrust
                sat_list[i].x += steer_direction.x;
                sat_list[i].y += steer_direction.y;
                
            }
        }

        // Wrap around to other side of screen if satellite
        // has gone over.
        if (sat_list[i].x > this.scale.width) {
            sat_list[i].x -= this.scale.width;
        } else if (sat_list[i].x < 0) {
            sat_list[i].x += this.scale.width;
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

    this.graphics.lineStyle(0.5, 0x04D9FF);
    for (var i=0; i<this.link_line_list.length; i++) {
        this.graphics.lineBetween(...this.link_line_list[i]);
    }

    this.graphics.lineStyle(0.5, 0xFFFF00);
    for (var i=0; i<this.avoid_line_list.length; i++) {
        this.graphics.lineBetween(...this.avoid_line_list[i]);
    }
}