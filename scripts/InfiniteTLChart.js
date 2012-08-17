//////////////////////////////////////////////////////////////////////////////////////
//
//	Copyright 2012 Mihai Corlan (http://corlan.org | @mcorlan)
//
//	Licensed under the Apache License, Version 2.0 (the "License");
//	you may not use this file except in compliance with the License.
//	You may obtain a copy of the License at
//
//		http://www.apache.org/licenses/LICENSE-2.0
//
//	Unless required by applicable law or agreed to in writing, software
//	distributed under the License is distributed on an "AS IS" BASIS,
//	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//	See the License for the specific language governing permissions and
//	limitations under the License.
//
//////////////////////////////////////////////////////////////////////////////////////

/**
 * This is a simple chart example that supports infinite scrolling on the timeline axis (the oX axis).
 * Because it uses Canvas and HTML elements to create the chart, and listens for both touch
 * and mouse events it should work fine on tablets, smartphones, and desktops.
 *
 * Main features:
 * - Mobile and desktop friendly (tested on iOS, Android, Safari, Chrome Mac)
 * - You can scroll lef or right by dragging the chart area to the right or left
 * - You can change the chart "density" by dragging one of the vertical lines to the left
 * (if you want to increase the number of months) or to the right (if you want to decrease the number of months)
 * - You can see additional info for each data by touching/hovering on it (a tooltip will be displayed)
 *
 *  If you want to modify the chart type, the easiest way is to pass to the constructor a new plotData function.
 *  Using the arguments you receive you can "paint" the data for the current state of the chart.
 *
 * Created by Mihai Corlan. More info at http://corlan.org or http://twitter.com/mcorlan
 *
 */

(function(window) {

    /**
     * The constructor.
     * @param element
     * @param recordset
     * @constructor
     */
    InfiniteTLChart = function(element, recordset, plotData) {
        if (recordset === null || typeof recordset === 'undefined') {
            recordset = this.getDummyData();
        }
        this.dataProvider = this.readData(recordset);
        if (plotData !== undefined && plotData !== null) {
            this.plotData = plotData;
        }
        this.initialize(element);
    }

    var p = InfiniteTLChart.prototype;
    p.constructor = InfiniteTLChart;

    p.parent    = null;
    p.titleDiv  = null;
    p.canvas    = null;
    p.chartContext  = null;
    p.hChart = null;
    p.wChart = null;
    p.yTicks = null;
    p.xTicks = null;
    p.pxPerDay = null;
    p.xDensity = null;
    p.chartGutterTop = null;
    p.chartGutterBottom = null;
    p.chartGutterLeft = null;
    p.chartGutterRight = null;
    p.chartIsDrawing = false;
    p.panning = false;
    p.initialChartPanningX = null;
    p.scrollChartBy = null;
    p.currentScroll = null;
    p.chartXOffset = null;
    p.chartOriginX = null;
    //plotting related data
    p.toolTip = null;
    p.toolTipView = null;
    p.plotDataDiv = null;
    p.dataProvider = null;
    p.maxRevenue = null;
    p.circleDiameter = null;
    p.currentDateInterval = null;
    p.dragObj = null;
    p.divPool = null;
    p.YdivPool = null;

    /**
     * This function initialize some of the properties, then creates the chart elements, and finally draws the data.
     * It is called from the constructor or updateSize() method.
     * @param element the DOM element that acts a parent for the chart
     */
    p.initialize = function(element) {
        var startingDate;
//        console.log('InfiniteTLChart.initialize()');
        this.parent = element;
        this.setInitialValues();

        //create the DIV chart title
        this.titleDiv = this.createChartTitle();
        element.appendChild(this.titleDiv);

        // create the canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = parseInt(element.style.width);
        this.canvas.height = parseInt(element.style.height) - this.titleDiv.offsetHeight;
        element.appendChild(this.canvas);

        this.chartContext = this.canvas.getContext('2d');
        this.hChart = this.canvas.height - this.chartGutterTop - this.chartGutterBottom;
        this.wChart = this.canvas.width - this.chartGutterLeft - this.chartGutterRight;
        this.circleDiameter = Math.round(Math.min(this.hChart, this.wChart) / 3);
        //map a day to a number of pixels
        this.pxPerDay =  (this.wChart - this.chartXOffset) / (this.xDensity * 30);
        if (this.chartXOffset < this.pxPerDay) {
            this.chartXOffset = this.pxPerDay;
        }
        startingDate = this.dataProvider[0].closeDate;
        this.chartOriginX = {
                    x: this.chartXOffset,
                    date: new Date(startingDate.getFullYear(), startingDate.getMonth(), 1),
                    originDate: new Date(startingDate.getFullYear(), startingDate.getMonth(), 1 - Math.floor(this.chartXOffset / this.pxPerDay))
        };
        this.yTicks = Math.floor(this.hChart / 5);

        // create and set the overlay DIV - position and size
        this.plotDataDiv = this.createChartMask();
        element.appendChild(this.plotDataDiv);

        //add the tooltip
        this.toolTip = this.createToolTip();
        this.plotDataDiv.appendChild(this.toolTip);
        this.toolTipView = document.getElementById('toolTipView');
        this.drawChart();
        //add event listener for listening for panning gestures
        this.addEventListenersChart();
    }
    /**
     * Initialize a bunch of properties.
     */
    p.setInitialValues = function() {
       this.divPool = [];
       this.YdivPool = [];
       this.xDensity = 3; //number of months to be displayed
       this.scrollChartBy = 0;
       this.currentScroll = 0;
       this.chartXOffset = 10;
       this.currentDateInterval = {sDate: undefined, eDate: undefined, xDates: undefined};
       // set gutter values
       this.chartGutterRight = 0;
       this.chartGutterLeft = 45;
       this.chartGutterTop = 10;
       this.chartGutterBottom = 25;
    }
    /**
     * Creates the div that holds tha chart title.
     * @return {Element}
     */
    p.createChartTitle = function() {
        var div = document.createElement('div');
        div.className = 'chartTitle';
        div.innerHTML = 'Loading Data<br>...';
        return div;
    }
    /**
     * Creates the div element used to hold the chart data and enable scrolling on oX axis
     * @return {Element}
     */
    p.createChartMask = function () {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.overflow = 'hidden';
        div.style.left = this.chartGutterLeft + 'px';
        div.style.top = this.chartGutterTop + this.titleDiv.offsetHeight +  'px';
        div.style.width = this.wChart + 'px';
        div.style.height = this.hChart + 'px';
        return div;
    };
    /**
     * Creates the tooltip DIV. There is only one tooltip that is reused.
     * @return {Element}
     */
    p.createToolTip = function() {
        var div = document.createElement('div');
        div.className = 'tt-hidden';
        div.innerHTML = '<div class="tt-arrow"></div><div class="tt-inner" id="toolTipView"></div>';
        return div;
    }
    /**
     * Adds the dragging listeners to the div that holds the chart data
     */
    p.addEventListenersChart = function() {
        var that = this;
        //events for touch
        this.plotDataDiv.addEventListener('touchstart', function(event) {that.onChartStartTouch(event)}, false);
        this.plotDataDiv.addEventListener('touchmove',  function(event) {that.onChartDrag(event)},       false);
        this.plotDataDiv.addEventListener('touchend',   function(event) {that.onChartEndTouch(event)},   false);
        //events for mouse
        this.plotDataDiv.addEventListener('mousedown',  function(event) {that.onChartMouseDown(event)},  false);
        this.plotDataDiv.addEventListener('mousemove',  function(event) {that.onChartMouseDrag(event)},  false);
        this.plotDataDiv.addEventListener('mouseup',    function(event) {that.onChartMouseUp(event)},    false);

        this.dragObj = {zIndex: 0};
    }

    /**
     * Destroys the current chart and creates a new one with the size updated
     * to take in account a possible change in size of the host element
     * (like for example a screen orientation change).
     */
    p.updateSize = function() {
        var i, l,
            p = this.parent;
        if (p.hasChildNodes()) {
            while (p.childNodes.length >= 1) {
                p.removeChild(p.firstChild);
            }
        }
        this.titleDiv = null;
        this.canvas = null;
        this.plotDataDiv = null;
        this.toolTip = null;
        for (i = 0, l = this.dataProvider.length; i < l; i++) {
            this.dataProvider[i].div = null;
        }
        this.initialize(p);
    }
    /********************************************************
     * Drawing Functions
     *******************************************************/
    /**
     * This is the main function involved in drawing the chart.
     * It calls getXData() to set the new starting date and ending date plus the months to be drawn
     * on the oX axis.
     * It redraws the chart lines (canvas element) and labels; then it calls plotData() method to draw the
     * data.
     */
    p.drawChart = function() {
        var i, yLabel, xLabels, months, currentXOffset;
        if (this.chartIsDrawing)
            return;
        this.chartIsDrawing = true;
        //clear canvas for a new drawing
        this.chartContext.clearRect(0, 0, this.chartContext.canvas.width, this.chartContext.canvas.height);
        //add y labels
        this.chartContext.font = '15px sans-serif';
        this.chartContext.fillStyle = '#000000';
        yLabel = 100;
        for (i = 0; i < 5; i++) {
            this.chartContext.fillText( (yLabel === 100 ? '' : '  ') + yLabel + '%', 0, (this.yTicks * i + this.chartGutterTop + 5));
            yLabel -= 20;
        }
        //add x labels
        months = this.getXData();
        xLabels = this.formatData(months);
        currentXOffset = this.chartXOffset;
        for (i = 0; i < this.xDensity; i++) {
            this.chartContext.fillText(xLabels[i], (this.chartGutterLeft + currentXOffset - 20), this.hChart + this.chartGutterTop + 22);
            currentXOffset += this.daysInMonth(months[i].getMonth(), months[i].getFullYear()) * this.pxPerDay;
        }

        //draw oX and oY axes
        this.chartContext.moveTo(this.chartGutterLeft, this.chartGutterTop);
        this.chartContext.lineTo(this.chartGutterLeft, this.hChart + this.chartGutterTop);
        this.chartContext.lineTo(this.wChart + this.chartGutterLeft, this.hChart + this.chartGutterTop);
        this.chartContext.strokeStyle = '#000000';
        this.chartContext.stroke();

        // draw horizontal lines
        this.chartContext.fillStyle = '#dedede';
        for (i = 0; i < 5; i++) {
            this.chartContext.fillRect(this.chartGutterLeft - 5, (this.chartGutterTop + this.yTicks * i), this.wChart, 1);
            yLabel -= 20;
        }
        // draw vertical lines
        currentXOffset = this.chartXOffset;
        this.createYdivs();
        for (i = 0; i < this.xDensity; i++) {
            this.chartContext.fillRect((this.chartGutterLeft + currentXOffset), this.chartGutterTop, 1, this.hChart + 5);
            // add the DIV element for adjusting the density
            this.YdivPool[i].style.webkitTransform = 'translateX(' + (currentXOffset - 11) + 'px)';
            this.YdivPool[i].style.display = '';
            currentXOffset += this.daysInMonth(months[i].getMonth(), months[i].getFullYear()) * this.pxPerDay;
        }
        //plot the data
        this.plotData(this.plotDataDiv, this.currentDateInterval, this.pxPerDay, this.dataProvider);
        this.chartIsDrawing = false;
    }
    /**
     * Draws the data.
     * @param div to be used for drawing the data
     * @param currentDateInterval current date interval {sDate: Date, eDate: Date, xDates: Array}
     * sDate and eDate represent the first and last date part of the current chart
     * @param pxPerDay pixels for one day
     * @param dataProvider {array} the data provider
     */
    p.plotData = function(div, currentDateInterval, pxPerDay, dataProvider) {
        var l, i, s, e, d, div, x,
            amount = 0,
            s = this.currentDateInterval.sDate.getTime(),
            e = this.currentDateInterval.eDate.getTime(),
            l = this.dataProvider.length,
            msInDay = 86400000; // 24 * 60 * 60 * 1000

        // loop through all the data and update their DIV position
        for (i = 0; i < l; i++) {
            d = this.dataProvider[i].closeDate.getTime();
            div = this.dataProvider[i].div;

            if (d > e) {
                // hide div because it is out of the view
                if (div !== undefined && div !== null) {
                    this.cacheDiv(div, this.dataProvider[i]);
                }
                continue;
            }

            // add this data to the chart
            if (d >= s) {
                // create a DIV; set the size
                if (div === undefined || div === null) {
                    if (this.divPool.length) {
                        div = this.divPool.pop();
                        this.setDataToDiv(div, this.dataProvider[i]);
                    } else {
                        div = this.createNewDiv(this.dataProvider[i]);
                        this.plotDataDiv.appendChild(div);
                    }
                }

                // set DIV x position
                x = Math.floor( (d - s) / msInDay );
                x = x * this.pxPerDay;

                if (div.style.display === 'none')
                    div.style.display = '';
                x = x - div.data;
                div['data-x'] = x;
                div.style.webkitTransform = 'translateX(' + x + 'px)';
                amount += this.dataProvider[i].revenue;
            } else {
                // hide div because it is out of the view
                if (div !== undefined && div !== null) {
                    this.cacheDiv(div, this.dataProvider[i]);
                }
            }
        }
        this.updateChartTitle(amount, this.currentDateInterval.sDate, this.currentDateInterval.eDate);
    }
    /**
     * Calculates chartXOffset and the dates to be drawn on the oX axis.
     * This function must be called before plotData().
     * @return {Array} of Date
     */
    p.getXData = function() {
        var totalScroll, days, firstDate, i,
            ret = [];

        totalScroll = this.scrollChartBy + this.currentScroll;
        if (totalScroll === 0) {
            firstDate = this.chartOriginX.originDate;
        } else {
            days = Math.floor(totalScroll / this.pxPerDay);
            firstDate =  new Date(this.chartOriginX.originDate.getFullYear(), this.chartOriginX.originDate.getMonth(), this.chartOriginX.originDate.getDate() - days);
        }

        if (firstDate.getDate() !== 1) {
            if (totalScroll === 0) {
                this.chartXOffset = this.chartOriginX.x;
            } else {
                this.chartXOffset = this.pxPerDay * (this.daysInMonth(firstDate.getMonth(), firstDate.getFullYear()) - firstDate.getDate());
            }
            ret[0] = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 1);
        } else {
            this.chartXOffset = 0;
            ret[0] = firstDate;
        }

        for (i = 1; i < this.xDensity + 1; i++) {
            ret[i] = new Date(ret[0].getFullYear(), ret[0].getMonth() + i, 1);
        }

        this.currentDateInterval.sDate = firstDate;
        this.currentDateInterval.eDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() + Math.floor(this.wChart / this.pxPerDay));
        this.currentDateInterval.xDates = ret;
        return ret;
    }


    /**
     * Creates the divs used for enabling dragging on the vertical chart lines.
     */
    p.createYdivs = function() {
        var div,
            i = 0,
            that = this,
            l = this.xDensity,
            noExistingDivs = this.YdivPool.length;
        // we need more lines
        if (noExistingDivs < l) {
            i = noExistingDivs;
            // we don't have enough lines or any line at all
            for (i; i < l; i++) {
                div = document.createElement('div');
                div.className = 'verticalLineHandler';
                div.style.height = this.hChart + 'px';
                this.plotDataDiv.appendChild(div);
                this.YdivPool.push(div);
                // attach handlers
                // events for touch
                div.addEventListener('touchstart', function(event) {that.dragTouchStart(event)}, false);
                div.addEventListener('touchmove',  function(event) {that.dragTouchMove(event)},       false);
                div.addEventListener('touchend',   function(event) {that.dragTouchEnd(event)},   false);
                // events for mouse
                div.addEventListener('mousedown',  function(event) {that.onYDivMouseDown(event)},  false);
            }
            return;
        }
        // we have too many lines
        if (noExistingDivs > l) {
            for (i = l; i < noExistingDivs; i++) {
                this.YdivPool[i].style.display = 'none';
                this.YdivPool[i].style.webkitTransform = 'translateX(' + -100 + 'px)';
            }
            return;
        }
    }

    /**
     * Dragging functions for chart vertical lines
     */
    p.onYDivMouseDown = function(e) {
        var that = this;
        e.touches = [{clientX: e.clientX, clientY: e.clientY}];
        this.dragTouchStart(e);

        this.onYDivMouseDrag        = function(event) {that.dragGo(event)};
        this.onYDivMouseUp          = function(event) {that.dragStop(event)};
        // Capture mousemove and mouseup events on the page.
        document.addEventListener('mousemove',  this.onYDivMouseDrag,   true);
        document.addEventListener('mouseup',    this.onYDivMouseUp,     true);
        e.stopPropagation();
    }
    p.dragTouchStart = function(e) {
        e.preventDefault();
        this.dragObj.elNode = e.target;
        e.target.className = 'verticalLineHandlerDrag';
        this.dragObj.cursorStartX = e.touches[0].clientX + window.scrollX;
        this.dragObj.totalMove = 0;
        this.dragObj.elStartLeft  = parseInt(e.target.style.webkitTransform.replace("translateX(",""), 10);
        e.stopPropagation();
    }
    p.dragGo = function(e) {
        e.touches = [{clientX: e.clientX, clientY: e.clientY}];
        this.dragTouchMove(e);
    }
    p.dragTouchMove = function(e) {
        // Get cursor position with respect to the page.
        var x = e.touches[0].clientX + window.scrollX;
        e.preventDefault();
        x = this.dragObj.elStartLeft + x - this.dragObj.cursorStartX;
        this.dragObj.totalMove = x;
        // Move drag element by the same amount the cursor has moved.
        if (this.dragObj.elNode !== null)
            this.dragObj.elNode.style.webkitTransform = 'translateX(' + x + 'px)';
        e.stopPropagation();
    }
    p.dragStop = function(e) {
        // Stop capturing mousemove and mouseup events.
        document.removeEventListener('mousemove', this.onYDivMouseDrag,   true);
        document.removeEventListener('mouseup',   this.onYDivMouseUp,     true);
        e.touches = [{clientX: e.clientX, clientY: e.clientY}];
        this.dragTouchEnd(e);
    }
    p.dragTouchEnd = function(e) {
        var x;
        if (e.touches && e.touches.length > 0) {
            x = e.touches[0].clientX + window.scrollX;
        } else {
            x = this.dragObj.totalMove;
        }
        x = this.dragObj.cursorStartX - x;
        e.stopPropagation();
        this.dragObj.elNode.className = 'verticalLineHandler';
        this.pxPerDay = (this.pxPerDay * 30 - x) / 30;
        if (this.pxPerDay < 6) {
            this.pxPerDay = 6;
        }
        this.xDensity = Math.floor((this.wChart ) / (this.pxPerDay * 30) );
        if (this.xDensity < 3) {
            this.xDensity = 2;
            this.pxPerDay = (this.wChart - this.chartOriginX.x) / (2 * 30);
        }
        this.dragObj.elNode = null;
        this.drawChart();
    }

    /**
     * When a div is hidden because it is out of the current date range it is added to a pool
     * to be reused later if needed.
     * @param div
     * @param data
     */
    p.cacheDiv = function(div, data) {
        div.style.display = 'none';
        x = -1000;
        div.style.webkitTransform = 'translateX(' + x + 'px)';
        this.divPool.push(div);
        data.div = null;
        div['data-provider'] = null;
    }
    /**
     * Updates the Chart Title to reflect the current date selection and total amount displayed
     * @param total
     * @param startDate
     * @param endDate
     */
    p.updateChartTitle = function(total, startDate, endDate) {
        var days = Math.round(Math.abs(startDate.getTime() - endDate.getTime()) / 86400000);
        this.titleDiv.innerHTML = 'Pipeline from ' + this.formatSingleDate(startDate) + ' to ' + this.formatSingleDate(endDate) + ' (' + days + ' days)<br>' + 'Projected Revenue: $' + this.addCommas(total);
    }

    /**
     * Chart dragging functions
     */
    p.onChartStartTouch = function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.panning = true;
        this.hideTooltip();
        this.initialChartPanningX = e.touches[0].clientX;
    }
    p.onChartDrag = function(e) {
        if (!this.panning)
            return;
        e.preventDefault();
        e.stopPropagation();
        this.hideTooltip();
        this.currentScroll = e.touches[0].clientX - this.initialChartPanningX;
        this.drawChart();
    }
    p.onChartEndTouch = function(e) {
        e.stopPropagation();
        this.panning = false;
        this.scrollChartBy += this.currentScroll;
    }

    p.onChartMouseDown = function(e){
        e.stopPropagation();
        this.panning = true;
        this.hideTooltip();
        this.initialChartPanningX = e.clientX;
    }
    p.onChartMouseDrag = function(e){
         if (!this.panning)
            return;
        e.stopPropagation();
        this.currentScroll = e.clientX - this.initialChartPanningX;
        this.drawChart();
    }
    p.onChartMouseUp = function(e) {
        if (!this.panning)
            return;
        e.stopPropagation();
        this.panning = false;
        this.scrollChartBy += this.currentScroll;
    }

    /**
     * Creates one DIV for representing one data on the chart
     * @param data
     * @return {DIV}
     */
    p.createNewDiv = function(data) {
        var div,
            that = this;
        div = document.createElement('div');
        div.style.backgroundColor = '#cea746';
        div.style.border = 'solid 1px #000';
        div.style.opacity = 0.8;
        div.style.position = 'absolute';
        this.setDataToDiv(div, data);
        //attach the event listeners for the tooltips
        div.addEventListener('mouseover',   function(event) {that.showTooltip(event)},    false);
        div.addEventListener('mouseout',    function(event) {that.hideTooltip(event)},    false);
        div.addEventListener('touchstart',  function(event) {that.showTooltip(event)},    false);
        div.addEventListener('touchend',    function(event) {that.hideTooltip(event)},    false);
        return div;
    }

    /**
     * Sets the DIV for the given data;
     * @param div this is used to represent the data
     * @param data the data to be represented
     */
    p.setDataToDiv = function(div, data){
        var size = Math.round(this.circleDiameter * (data.revenue / this.maxRevenue));
        div.style.width = size + 'px';
        div.style.height = size + 'px';
        div.data = Math.round(size / 2);
        div.style.borderRadius = div.data + 'px';
        div['data-y'] = Math.round(this.hChart - (data.probability / 100) * this.hChart - size / 2);
        div.style.top =  div['data-y'] + 'px';
        data.div = div;
        div['data-provider'] = data;
    }
    /**
     * Shows the tooltip for the selected div/data
     * @param e
     */
    p.showTooltip = function(e) {
        var m, x, y, c, d, xDiv, yDiv, t;
        if (this.panning)
            return;
        e.preventDefault();
        t = e.target;
        m = t['data-provider'];
        x = t['data-x'];
        y = t['data-y'];
        d = (m.closeDate.getMonth() + 1) + '/' + m.closeDate.getDate() + '/' + m.closeDate.getFullYear().toString().substr(2);
        this.toolTipView.innerHTML = '<strong>Project: ' + m.project + '</strong><br/>Account: ' + m.account + '<br/>Revenue: $' + this.addCommas(m.revenue) + '<br/>Close Date: ' + d + '<br/>Probability: ' + m.probability + '%';
        this.toolTip.className = 'tt right';
        this.toolTip.style.left = '-500px';
        this.toolTip.style.top = '0px';
        c = 'tt right';
        yDiv = y - this.toolTip.offsetHeight / 2 + t.data;
        if (this.wChart/2 < x) {
            c = 'tt left';
            xDiv = x - this.toolTip.offsetWidth;
        } else {
            xDiv = x + t.data * 2 + this.toolTip.offsetWidth;
            xDiv = x + t.data * 2 ;
        }
        if (yDiv < 0) {
            c = 'tt below';
            xDiv = x - this.toolTip.offsetWidth / 2 + t.data;
            yDiv = t['data-y'] + t.data * 2;
        } else if ((yDiv + this.toolTip.offsetHeight) > this.plotDataDiv.offsetHeight) {
            c = 'tt above';
            xDiv = x - this.toolTip.offsetWidth / 2 + t.data;
            yDiv = t['data-y'] - this.toolTip.offsetHeight;
        }
        this.toolTip.className = c;
        this.toolTip.style.left = xDiv + 'px';
        this.toolTip.style.top = yDiv + 'px';
        e.stopPropagation();
    }
    /**
     * Hides the tooltip
     * @param e
     */
    p.hideTooltip = function(e) {
        if (e)
            e.stopPropagation();
        this.toolTip.className = 'tt-hidden';
    }

    /**
     *  Sets the maximum value found n the recordset.
     *  The recordset must be order by date (ASC order)
     * @return Array {project, account, revenue, closeDate, probability, div}
     */
    p.readData = function(recordset) {
        var i, l;
        //set the maximum revenue value;
        this.maxRevenue = 0;
        if (recordset === null || typeof recordset === 'undefined')
            return [];
        l = recordset.length;
        for (i = 0; i < l; i++) {
            this.maxRevenue = Math.max(this.maxRevenue, recordset[i].revenue);
        }
        return recordset;
    }

/******************************************************************
* Utility functions
*****************************************************************/

    /**
     * Returns the number of days for the given month and year
     * @param iMonth
     * @param iYear
     * @return {Number} 27 to 31
     */
    p.daysInMonth = function(iMonth, iYear) {
        return 32 - new Date(iYear, iMonth, 32).getDate();
    }
    /**
     * Formats the date by adding a leading 0 to months 1-9
     * @param d {Date}
     * @return {String} mm/dd/yyyy
     */
    p.formatSingleDate = function(d) {
        return (d.getMonth() < 9 ? '0': '') + (d.getMonth() + 1) + '/' + (d.getDate() < 10 ? '0' : '') + d.getDate() + '/' + d.getFullYear().toString();
    }
    /**
     * Formats the Date to a string of this format m/yy
     * @param arr {Array} of Dates
     * @return {Array} of Strings m/yy
     */
    p.formatData = function(arr) {
        var ret = [], i;
        for (i = 0; i < arr.length; i++) {
            ret[i] =  (arr[i].getMonth() < 9 ? '\n\n': '') + (arr[i].getMonth() + 1) + '/' + arr[i].getFullYear().toString().substr(2);
        }
        return ret;
    }
    /**
     * Adds commas to separate thousands
     * @param num
     * @return {String}
     */
    p.addCommas = function(num) {
        num = num + '';
        return num.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    }
    /**
     * Provide some dummy data to test the chart
     * @return {Array}
     */
    p.getDummyData = function() {
        return [
                {
                    project: 'Apollo',
                    account: 'Adobe',
                    revenue:  250000,
                    closeDate: new Date(2011, 11, 1),
                    probability: 30,
                    div: undefined
                },
                {
                    project: 'Gamma',
                    account: 'JetBlue',
                    revenue:  300000,
                    closeDate: new Date(2012,0,7),
                    probability: 60,
                    div: undefined
                },
                {
                    project: 'Air',
                    account: 'Google',
                    revenue:  470000,
                    closeDate: new Date(2012, 0, 22),
                    probability: 40,
                    div: undefined
                },
                {
                    project: 'Alpha',
                    account: 'Google',
                    revenue:  575000,
                    closeDate: new Date(2012, 0, 26),
                    probability: 90,
                    div: undefined
                },
                {
                    project: 'Lamda',
                    account: 'Motorola',
                    revenue:  150000,
                    closeDate: new Date(2012, 1, 0),
                    probability: 5,
                    div: undefined
                },
                {
                    project: 'Salsa',
                    account: 'Adobe',
                    revenue:  198000,
                    closeDate: new Date(2012, 1, 16),
                    probability: 50,
                    div: undefined
                },
                {
                    project: 'Big Bang',
                    account: 'Motorola',
                    revenue:  250000,
                    closeDate: new Date(2012, 1, 21),
                    probability: 70,
                    div: undefined
                },
                {
                    project: 'Delta',
                    account: 'JetBlue',
                    revenue:  345000,
                    closeDate: new Date(2012, 2, 7),
                    probability: 50,
                    div: undefined
                },
                {
                    project: 'Omega',
                    account: 'McDonald\'s Corp',
                    revenue:  300000,
                    closeDate: new Date(2012, 2, 27),
                    probability: 60,
                    div: undefined
                },
                {
                    project: 'Corfu',
                    account: 'Verizon',
                    revenue:  500000,
                    closeDate: new Date(2012, 3, 23),
                    probability: 82,
                    div: undefined
                },
                {
                    project: 'New Era',
                    account: 'McDonald\'s Corp',
                    revenue:  600000,
                    closeDate: new Date(2012, 3, 3),
                    probability: 30,
                    div: undefined
                },
                {
                    project: 'Malibu',
                    account: 'Verizon',
                    revenue:  700000,
                    closeDate: new Date(2012, 4, 2),
                    probability: 24,
                    div: undefined
                },
                {
                    project: 'Borneo',
                    account: 'Adobe',
                    revenue:  400000,
                    closeDate: new Date(2012, 5, 9),
                    probability: 85,
                    div: undefined
                }
                ];
    }


    window.InfiniteTLChart = InfiniteTLChart;
}(window));
