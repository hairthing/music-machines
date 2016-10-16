var midi = require('midi');
var Machine = require("./gcode-sender");

var machine = new Machine();
machine.listPorts();
machine.connect();
machine.startPerforming();
var input = new midi.input();
input.openVirtualPort("String Music Machine");

/*
midi
adjust to midi range
convert to string length
convert to string position


60 > 12 > 205mm > 205mm
55 > 7 > ~307mm > 103mm
72 > 24 > 102 > 308

*/


// gt2-16 belt pulley
// 10.85 outer diameter of pully
// 1 step = 1/200 of π(10.85) = (π * 10.85) / 200

var WHEEL_CIRCUMFERENCE = (Math.PI * 10.85); // 34.069 mm
var STEP_LENGTH = WHEEL_CIRCUMFERENCE / 200; // 0.17 mm
var WAVE_SPEED = 1; // m/s -- speed of sound in infinity
var STRING_LENGTH = WHEEL_CIRCUMFERENCE * 30;
var SLIDE_POSITION = 0; // in steps
var lastPitch = 48; // MIDI C2
// A4  440.00 Hz  78.41 m

var OCTAVE_2_SLIDE_POSITION = (WHEEL_CIRCUMFERENCE * 15) / STEP_LENGTH;

class Slide {
  constructor(options) {
    this.fullStringLength = options.fullStringLength;
    this.currentLength = this.fullStringLength; // m
    this.rootPitch = options.rootPitch;
    this.pitch = options.rootPitch;
    this.rootFrequency = this.frequencyShift(440, this.rootPitch - 69);
    // console.log("!!!this.rootFrequency=", this.rootFrequency);
  }

  lengthToFrequency(length) { // in millimeters
    // frequency = WAVE_SPEED / length
    return 1 / length;
  }

  frequencyToLength(frequency) {
    // length = WAVE_SPEED / frequency
    return this.fullStringLength / (frequency / this.rootFrequency);
  }

  currentLengthShift(halfsteps) {
    var frequency = this.lengthToFrequency(this.currentLength);
    var newFrequency = this.frequencyShift(frequency, halfsteps);
    var newLength = this.frequencyToLength(newFrequency);
    this.currentLength = newLength;
    return newLength;
  }

  pitchToLength() {
    // var pitch = this.pitch - this.rootPitch;
    // console.log("***",this.pitch, this.rootPitch);
    var frequency = this.midiToFrequency();
    // console.log("frequency=", frequency);
    var newLength = this.frequencyToLength(frequency);
    this.currentLength = newLength;
    return newLength;
  }

  frequencyShift(frequency, halfsteps) {
    halfsteps = halfsteps || 12;
    return Math.pow(2, (halfsteps/12)) * frequency;
  }

  midiToFrequency(pitch) {
    return Math.pow(2, (this.pitch/12)) * this.rootFrequency;
  }

  midiPitchToNewLength(pitch) {
    var pitchDifference = pitch - this.pitch;
    this.pitch = pitch;
    console.log(pitchDifference,"pitchDifference");
    return this.currentLengthShift(pitchDifference);
  }

  setPitch(pitch){
    this.pitch = pitch;
    var newLength = this.pitchToLength();
    // var newLength = this.midiPitchToNewLength(pitch);
    // console.log("string length", newLength);
    var slidePosition = this.fullStringLength - newLength;
    // console.log("slidePosition", slidePosition);
    return "//";
    // TODO output gcode to serial
  }

  goToPitch(pitch){
    // adjust to midi range
    this.pitch = pitch - this.rootPitch;
    // convert to string length
    var length = this.pitchToLength();
    // convert to string position
    var position = this.fullStringLength - length;
    position = position < 0 ? 0 : position;
    position = position > this.fullStringLength ? this.fullStringLength : position;
    console.log(position);
    machine.goTo(parseInt(position,10));
    return position;
  }
}

var slide = new Slide({
  rootPitch: 48, // midi C2
  fullStringLength: 250 // millimeters
});

// var sequence = [60,67,69,67,65,64,62,60];
var sequence = [60,72,48];
var sequence = [60,55,72];
// var sequence = [60,60,60,60,72,60];
// for (i=0;i<sequence.length;i++) {
//   slide.goToPitch(sequence[i]);
// }

input.on('message', function(deltaTime, message) {
  if (message[0] == 144 && message[2] > 0) {
    console.log('pitch:', message);
    slide.goToPitch(message[1]); // message[status, data1, data2]
  }
});
