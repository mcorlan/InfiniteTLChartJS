<div>
    <h3>What is InfiniteTLChartJS?</h3>
    <p>It is a simple chart example that supports infinite scrolling on the timeline axis (the oX axis). Because it uses
     the Canvas element and HTML elements to create the chart, and listens for both touch and mouse events it should
     work fine on tablets, smartphones (iOS, Android), and desktops (WebKit based browsers and Firefox).</p>
    <p>You can test this code <a href="http://corlan.org/downloads/_html/InfiniteTLChartJS/">here</a>.</p>

    <h3>Main Features</h3>
    <p>Mobile and desktop friendly - it works on WebKit based browsers (tested on iOS, Android, Safari, Chrome Mac).</p>
    <p>You can scroll lef or right by dragging the chart area to the right or left.</p>
    <p>You can change the chart "density" by dragging one of the vertical lines to the left (if you want to increase the
     number of months) or to the right (if you want to decrease the number of months)</p>
    <p>You can see additional info for each data by touching/hovering on it (a tooltip will be displayed).</p>
    <p>It uses webkitTransform/MozTransform for moving the DIVs around. This is why it works only on WebKit based
    browsers and Firefox. Though it shouldn't be that hard to adapt the code for other browsers providing they have
    support for transform translateX().</p>

    <h3>Changing the Chart Type</h3>
    <p>If you want to modify the chart type, the easiest way is to pass to the constructor a new plotData() function.
    The arguments passed to this function are all you need to "plot" the data you want to draw.</p>
    <p>Other than this there should be only two places where you might want to tweak: the array structure for your data
    and the tooltip functions.</p>

    <h3>More Info</h3>
    <p>If you want to read more about how it works check my <a href="http://corlan.org/2012/08/18/infinite-timeline-scrolling-chart-with-htmlcssjs/">blog post</a>.</p>
</div>