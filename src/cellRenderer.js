import { Delaunay } from 'd3-delaunay';

export function cellRenderer(graph, ctx) {
    if (!ctx) return;

    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    const points = Object
                    .values(this.nodeIdx)
                    .filter(n => {
                        //return (n.level >= Math.max(1, this.MAX_GROUP_LEVELS - 1)) && !n.isContained
                        return !n.isContained
                    })
                    .map(n => {
                        return {
                            x: n.x,
                            y: n.y,
                            color: n.color,
                            identity: n.identity,
                            level: n.level,
                        }
                    });

    const delaunay = Delaunay.from(points.map(p => [p.x, p.y]));
    const topLeft = graph.screen2GraphCoords(0, 0);
    const bottomRight = graph.screen2GraphCoords(window.innerWidth, window.innerHeight);

    const voronoi = delaunay.voronoi([
        topLeft.x,
        topLeft.y,
        bottomRight.x,
        bottomRight.y
    ]);

    const _this = this;
    function drawVoronoi() {
        points.forEach((point, i) => {
            const cell = voronoi.cellPolygon(i);
            
            if (cell) {
                ctx.beginPath();
                let cellColor = point.color;

                /*if (point.level == _this.MAX_GROUP_LEVELS - 1) {
                    cellColor = blendColors([
                        point.identity.toColor(),
                        'rgba(255, 255, 255)'
                    ]);
                }*/

                if (0) {
                    cellColor = _this.buildColor(point.identity.toColor(true), 0.95);
                }

                ctx.fillStyle = cellColor

                ctx.moveTo(cell[0][0], cell[0][1]);
                for (let j = 1; j < cell.length; j++) {
                    ctx.lineTo(cell[j][0], cell[j][1]);
                }
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#888';

                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        if (0) {
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = '#0004';
                ctx.fill();
            });
        }
    }

    drawVoronoi();

    /*// Add click interaction to regenerate
    canvas.addEventListener('click', () => {
        points.forEach(point => {
            point.x = Math.random() * width;
            point.y = Math.random() * height;
            point.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        });
        
        delaunay.points.set(points.flatMap(p => [p.x, p.y]));
        voronoi.update();
        drawVoronoi();
    });*/
}
