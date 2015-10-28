/*
 Code for Life

 Copyright (C) 2015, Ocado Limited

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.

 ADDITIONAL TERMS – Section 7 GNU General Public Licence

 This licence does not grant any right, title or interest in any “Ocado” logos,
 trade names or the trademark “Ocado” or any other trademarks or domain names
 owned by Ocado Innovation Limited or the Ocado group of companies or any other
 distinctive brand features of “Ocado” as may be secured from time to time. You
 must not distribute any modification of this program using the trademark
 “Ocado” or claim any affiliation or association with Ocado or its employees.

 You are not authorised to use the name Ocado (or any of its trade names) or
 the names of any author or contributor in advertising or for publicity purposes
 pertaining to the distribution of this program, without the prior written
 authorisation of Ocado.

 Any propagation, distribution or conveyance of this program must include this
 copyright notice and these terms. You must not misrepresent the origins of this
 program; modified versions of the program must be marked as such and not
 identified as the original program.
 */
'use strict';

var ocargo = ocargo || {};

ocargo.circumference = function (radius) {
    return 2 * Math.PI * radius;
};

var MOVE_DISTANCE = GRID_SPACE_SIZE;

var DISTANCE_BETWEEN_THE_EDGE_AND_MIDDLE_OF_LEFT_LANE = 38;

var TURN_LEFT_RADIUS = 38;
var TURN_RIGHT_RADIUS = 62;
var TURN_AROUND_RADIUS = 12;

var TURN_LEFT_DISTANCE = ocargo.circumference(TURN_LEFT_RADIUS) / 4;
var TURN_RIGHT_DISTANCE = ocargo.circumference(TURN_RIGHT_RADIUS) / 4;

var TURN_AROUND_TURN_LEFT_DISTANCE = TURN_LEFT_DISTANCE / 2;
var TURN_AROUND_TURN_RIGHT_DISTANCE = TURN_RIGHT_DISTANCE / 2;
var TURN_AROUND_MOVE_FORWARD_DISTANCE = MOVE_DISTANCE / 2;
var TURN_AROUND_TURN_AROUND_DISTANCE = ocargo.circumference(TURN_AROUND_RADIUS) / 2;

var VEIL_OF_NIGHT_WIDTH = 4240;
var VEIL_OF_NIGHT_HEIGHT = 3440;

var VEIL_OF_NIGHT_URL = 'characters/top_view/VeilOfNight.svg';

ocargo.Character = function (paper, imageUrl, wreckageImageUrl, width, height, startingPosition, speed, nightMode, isVeilOfNight) {
    this.currentScale = 1;

    this.imageUrl = imageUrl;
    this.wreckageImageUrl = wreckageImageUrl;

    this.image = undefined;
    this.wreckageImage = undefined;

    this.paper = paper;
    this.width = width;
    this.height = height;
    this.startingPosition = startingPosition;
    this.nightMode = nightMode;
    this.isVeilOfNight = isVeilOfNight;
    this.speed = speed;

    if (this.nightMode) {
        this.veilOfNight = new ocargo.Character(paper, VEIL_OF_NIGHT_URL, null,
            VEIL_OF_NIGHT_WIDTH, VEIL_OF_NIGHT_HEIGHT, startingPosition, false, true);
    }

    this.initialOffsetX = -this.height / 2;
    this.initialOffsetY = DISTANCE_BETWEEN_THE_EDGE_AND_MIDDLE_OF_LEFT_LANE - (this.width / 2);
};

ocargo.Character.prototype._createCharacterImage = function () {
    return this.paper.image(ocargo.Drawing.raphaelImageDir + this.imageUrl, 0, 0,
        this.height, this.width);
};

ocargo.Character.prototype._createWreckageImage = function () {
    var wreckageImage = this.paper.image(ocargo.Drawing.raphaelImageDir + this.wreckageImageUrl, 0, 0, this.height, this.width);
    wreckageImage.attr({"opacity": 0});
    return wreckageImage;

};

ocargo.Character.prototype.render = function () {
    this.image = this._createCharacterImage();
    this._resetPosition();
    if (!this.isVeilOfNight) {
        this.wreckageImage = this._createWreckageImage();
        this.scrollToShow();
    }
    if (this.nightMode) {
        this.veilOfNight.render();
    }
};

ocargo.Character.prototype._setPosition = function (position) {
    var initialPosition = this._calculateCharactersInitialPosition(position.currentNode);
    this.image.transform('t' + initialPosition.x + ',' + initialPosition.y);

    var rotation = this._calculateInitialRotation(position.previousNode, position.currentNode);
    var transformation = ocargo.Drawing.rotationTransformationAroundCentreOfGridSpace(
        rotation,
        position.currentNode.coordinate.x,
        position.currentNode.coordinate.y);
    this.image.transform(transformation);
    this.image.transform('... r90'); // all characters face up by default
    this.image.attr({opacity: 1});
};

ocargo.Character.prototype._resetPosition = function () {
    this._setPosition(this.startingPosition);
};

ocargo.Character.prototype._calculateCharactersInitialPosition = function (startNode) {
    var coord = ocargo.Drawing.translate(startNode.coordinate);
    var result = {
        x: coord.x * GRID_SPACE_SIZE + this.initialOffsetX + PAPER_PADDING,
        y: coord.y * GRID_SPACE_SIZE + this.initialOffsetY + PAPER_PADDING
    };
    return result
};

ocargo.Character.prototype._calculateInitialRotation = function (previousNode, startNode) {
    var nodeAngleRadians = ocargo.calculateNodeAngle(previousNode, startNode);
    var nodeAngleDegrees = nodeAngleRadians * (180 / Math.PI);
    return -nodeAngleDegrees; // Calculation is counterclockwise, transformations are clockwise
};

ocargo.Character.prototype._imagePosition = function () {
    var box = this.image.getBBox();
    return [box.x, box.y];
};

ocargo.Character.prototype.scrollToShow = function () {
    var dx = 150;
    var dy = 150;

    this.skipOutstandingAnimations();
    var point = this._imagePosition();
    var element = document.getElementById('paper');

    var characterPositionX = point[0];
    var characterPositionY = point[1];
    var top = element.scrollTop;
    var left = element.scrollLeft;
    var width = element.offsetWidth;
    var height = element.offsetHeight;

    function scrollHorizontally(dx) {
        if (!(characterPositionX + dx <= left + width &&        // not too far right
            characterPositionX - dx >= left)) {
            element.scrollLeft = characterPositionX - (width / 2);
            return true;
        }
        return false;
    }

    function scrollVertically(dy) {
        if (!(characterPositionY + dy <= top + height &&       // and not too far down
            characterPositionY - dy >= top)) {
            element.scrollTop = characterPositionY - (height) / 2;
            return true;
        }
        return false;
    }

    if (scrollHorizontally(dx)) {
        scrollVertically(dy * 3);
    }

    if (scrollVertically(dy)) {
        scrollHorizontally(dx * 3);
    }

};


ocargo.Character.prototype.skipOutstandingAnimations = function () {
    if (!this.image) {
        return;
    }
    var anims = this.image.status();
    for (var i = 0, ii = anims.length; i < ii; i++) {
        this.image.status(anims[i].anim, 1);
    }

    if (this.veilOfNight) {
        this.veilOfNight.skipOutstandingAnimations();
    }
};

ocargo.Character.prototype._rotationPointX = function (radius) {
    var centreX = this.height / 2;    // x coordinate of the canvas of the character svg
    return centreX + (radius / this.currentScale);
};

ocargo.Character.prototype._rotationPointXForLeftTurn = function () {
    return this._rotationPointX(-TURN_LEFT_RADIUS);
};

ocargo.Character.prototype._rotationPointXForRightTurn = function () {
    return this._rotationPointX(TURN_RIGHT_RADIUS);
};

ocargo.Character.prototype._rotationPointXForTurnAround = function () {
    return this._rotationPointX(TURN_AROUND_RADIUS);
};

// Returns the y coordinate of the centre of rotation
ocargo.Character.prototype._rotationPointY = function () {
    var centreY = this.width / 2;     // y coordinate of the centre of the character svg
    return centreY;
};

ocargo.Character.prototype.moveForward = function (callback, scalingFactor) {
    var moveDistance = -MOVE_DISTANCE / this.currentScale;
    var transformation = "..." + "t 0, " + moveDistance;

    if (scalingFactor) {
        this.currentScale *= scalingFactor;
        transformation += "s" + scalingFactor;
    }

    var duration = MOVE_DISTANCE / this.speed;

    this._moveImage({
        transform: transformation
    }, duration, callback);

    if (this.veilOfNight) {
        this.veilOfNight.moveForward(null, scalingFactor);
    }
    return duration;
};

ocargo.Character.prototype.turnLeft = function (callback, scalingFactor) {
    var transformation = this._turnLeftTransformation(90, scalingFactor);

    var duration = TURN_LEFT_DISTANCE / this.speed;

    this._moveImage({
        transform: transformation
    }, duration, callback);

    if (scalingFactor) {
        this.currentScale *= scalingFactor;
    }

    if (this.veilOfNight) {
        this.veilOfNight.turnLeft(null, scalingFactor);
    }

    return duration;
};

ocargo.Character.prototype.turnRight = function (callback, scalingFactor) {
    var transformation = this._turnRightTransformation(90, scalingFactor);

    var duration = TURN_RIGHT_DISTANCE / this.speed;

    this._moveImage({
        transform: transformation
    }, duration, callback);
    if (scalingFactor) {
        this.currentScale *= scalingFactor;
    }

    if (this.veilOfNight) {
        this.veilOfNight.turnRight(null, scalingFactor);
    }

    return duration;
};

ocargo.Character.prototype.turnAround = function (direction) {
    var that = this;

    var actions = [];
    var index = 0;

    switch (direction) {
        case 'FORWARD':
            actions = [moveForward(), rotate(), moveForward()];
            break;
        case 'RIGHT':
            actions = [turnRight(), rotate(), turnLeft()];
            break;
        case 'LEFT':
            actions = [turnLeft(), rotate(), turnRight()];
            break;
    }


    var duration = 0.0;
    actions.forEach(function(action) {
        duration += action.duration;
    });

    var functions = actions.map(function (action) {
        return action.function;
    });

    performNextAction();

    function performNextAction() {
        if (index < functions.length) {
            functions[index]();
            index++;
        }
    }

    function moveForward() {
        var moveDistance = TURN_AROUND_MOVE_FORWARD_DISTANCE;
        var moveTransformation = "... t 0, -" + moveDistance;

        var duration = moveDistance / that.speed;

        var animate = function () {
            that.image.animate({
                transform: moveTransformation
            }, duration, 'linear', performNextAction);
        };

        return {
            'duration': duration,
            'function': animate
        };
    }

    function rotate() {
        var transformation = that._turnAroundTransformation();

        var duration = TURN_AROUND_TURN_AROUND_DISTANCE / that.speed;
        duration *= 2;

        var animate = function () {
            that.image.animate({
                transform: transformation
            }, duration, 'linear', performNextAction);
        };

        return {
            'duration': duration,
            'function': animate
        };
    }

    function turnLeft() {
        var transformation = that._turnLeftTransformation(45);

        var duration = TURN_AROUND_TURN_LEFT_DISTANCE / that.speed;

        var animate = function () {
            that.image.animate({
                transform: transformation
            }, duration, 'linear', performNextAction);
        };

        return {
            'duration': duration,
            'function': animate
        };
    }

    function turnRight() {
        var transformation = that._turnRightTransformation(45);

        var duration = TURN_AROUND_TURN_RIGHT_DISTANCE / that.speed;

        var animate = function () {
            that.image.animate({
                transform: transformation
            }, duration, 'linear', performNextAction);
        };

        return {
            'duration': duration,
            'function': animate
        };
    }

    if (this.veilOfNight) {
        this.veilOfNight.turnAround(direction);
    }

    return duration() + 45;
};

ocargo.Character.prototype.wait = function (animationLength, callback) {
    //no movement for now
    this._moveImage({
        transform: '... t 0,0'
    }, animationLength, callback);
};

ocargo.Character.prototype._moveImage = function (attr, animationLength, callback) {
    // Compress all current transformations into one
    this.image.transform(this.image.matrix.toTransformString());

    // Perform the next animation
    this.image.animate(attr, animationLength, 'linear', callback);
};

ocargo.Character.prototype._collisionImage = function (withFire) {
    if (withFire) {
        return Math.random() < 0.5 ? 'smoke.svg' : 'fire.svg';
    } else {
        return 'smoke.svg';
    }
};

ocargo.Character.prototype._animateCollision = function (withFire) {
    if (this.isVeilOfNight) {
        return function () {
        };
    }

    var that = this;
    if (CHARACTER_NAME !== "Van") {
        return;
    }
    var bbox = this.image.getBBox();

    var x = bbox.x + bbox.width / 2;
    var y = bbox.y + bbox.height / 2;

    var width = 20;
    var height = 20;

    var maxSize = 20;
    var minSize = 10;

    var explosionParts = 20;

    this.wreckageImage.transform(this.image.transform());

    setTimeout(function () {
        that.wreckageImage.animate({opacity: 1}, 1000);
        if (!this.nightMode) {
            that.image.animate({opacity: 0}, 1000);
        }

        for (var i = 0; i < explosionParts; i++) {
            setTimeout(function () {
                var size = minSize + Math.random() * (maxSize - minSize);
                var xco = x + width * (Math.random() - 0.5) - 0.5 * size;
                var yco = y + height * (Math.random() - 0.5) - 0.5 * size;
                var imageUrl = ocargo.Drawing.raphaelImageDir + that._collisionImage(withFire);
                var img = that.paper.image(imageUrl, xco, yco, size, size);
                img.animate({opacity: 0, transform: 's2'}, 1000, function () {
                    img.remove()
                });
            }, (i < 5 ? 0 : (i - 5) * 50));
        }
    }, 100);
};

ocargo.Character.prototype._animateCollisionWithFire = function () {
    var that = this;

    return function () {
        that._animateCollision(true);
    }
};

ocargo.Character.prototype._animateCollisionNoFire = function () {
    var that = this;
    return function () {
        that._animateCollision(false);
    }
};

ocargo.Character.prototype._turnLeftTransformation = function (rotationAngle, scalingFactor) {
    var rotationPointX = this._rotationPointXForLeftTurn();
    var rotationPointY = this._rotationPointY();
    var transformation = this._createRotationTransformation(-rotationAngle, rotationPointX, rotationPointY, scalingFactor);
    return transformation;
};

ocargo.Character.prototype._turnRightTransformation = function (rotationAngle, scalingFactor) {
    var rotationPointX = this._rotationPointXForRightTurn();
    var rotationPointY = this._rotationPointY();
    var transformation = this._createRotationTransformation(rotationAngle, rotationPointX, rotationPointY, scalingFactor);
    return transformation;
};

ocargo.Character.prototype._turnAroundTransformation = function () {
    var rotationPointX = this._rotationPointXForTurnAround();
    var rotationPointY = this._rotationPointY();
    var transformation = this._createRotationTransformation(180, rotationPointX, rotationPointY);
    return transformation;
};

ocargo.Character.prototype._animateCrash = function (animationLength, attemptedAction, callback) {
    if (attemptedAction === "FORWARD") {
        var distanceForwards;

        distanceForwards = 0.8 * GRID_SPACE_SIZE;
        var transformation = "... t 0, " + (-distanceForwards);
    } else if (attemptedAction === "TURN_LEFT") {
        var transformation = this._turnLeftTransformation(75);
    } else if (attemptedAction === "TURN_RIGHT") {
        var transformation = this._turnRightTransformation(75);
    }

    this._moveImage({
        transform: transformation
    }, animationLength, callback);
};

ocargo.Character.prototype.crash = function (animationLength, attemptedAction) {
    var crashAnimation = this._animateCollisionWithFire();

    this._animateCrash(animationLength, attemptedAction, crashAnimation);

    if (this.veilOfNight) {
        this.veilOfNight.crash(animationLength, attemptedAction);
    }
};

ocargo.Character.prototype.collisionWithCow = function (animationLength, previousNode, currentNode, attemptedAction) {
    if (attemptedAction === "FORWARD") {
        var distanceForwards = (0.5 * GRID_SPACE_SIZE - 0.5 * ROAD_WIDTH) / this.currentScale;
        var transformation = "... t 0, " + (-distanceForwards);
    } else if (attemptedAction === "TURN_LEFT") {
        var transformation = this._turnLeftTransformation(15);
    } else if (attemptedAction === "TURN_RIGHT") {
        var transformation = this._turnRightTransformation(15);
    }

    var newAnimationLength = animationLength * ((GRID_SPACE_SIZE - ROAD_WIDTH) / (GRID_SPACE_SIZE + ROAD_WIDTH));
    this._moveImage({
        transform: transformation
    }, newAnimationLength, this._animateCollisionNoFire());

    if (this.veilOfNight) {
        this.veilOfNight.collisionWithCow(animationLength, previousNode, currentNode, attemptedAction);
    }

    return newAnimationLength;
};

ocargo.Character.prototype._createRotationTransformation = function (degrees, rotationPointX, rotationPointY, scalingFactor) {
    var transformation = "..." + "r" + degrees;
    if (rotationPointX !== undefined && rotationPointY !== undefined) {
        transformation += ',' + rotationPointX;
        transformation += ',' + rotationPointY;
    }
    if (scalingFactor) {
        // extra scaling is done after rotation as scaling was taken into acocunt in getRotationPoints
        transformation += "s" + scalingFactor;
    }
    return transformation;
};

ocargo.Character.prototype._removeWreckage = function () {
    this.wreckageImage.attr({"opacity": 0});
};

ocargo.Character.prototype.reset = function () {
    this.skipOutstandingAnimations();
    this._resetPosition();
    if (!this.isVeilOfNight) {
        this._removeWreckage();
        this.currentScale = 1;
        this.scrollToShow();
    }

    if (this.veilOfNight) {
        this.veilOfNight.reset();
    }
};

ocargo.Character.prototype.setSpeed = function (speed) {
    this.speed = speed;
};
