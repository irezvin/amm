<?php
    $title = "Table";
    require(__DIR__.'/top.inc.php');
?> 
    <link rel="stylesheet" type="text/css" href="tbl.css" />
    <style type="text/css">
        .data, .cnt {
            margin: 0 auto;
        }
        h1 {
            text-align: center;
        }
    </style> 
    </head>
    <body>
        <h1>Table example</h1>
        <div data-amm-e="{
                class: Amm.Table,
                className: 'data',
                id: tbl,
                columns: {
                    idx: {caption: '#', source: '$cell.component.displayOrder + 1'},
                    firstName: {caption: 'First Name'},
                    lastName: {caption: 'Last Name'},
                    fullName: {caption: 'Full Name', cellClassName: 'light', source: 'this.firstName + \' \' + this.lastName'},
                    points: {caption: 'Points'},
                },
                
                header: {
                    rows: {
                        head: 'Amm.Table.HeaderRow'
                    }
                },
                
                items: {
                    class: 'Amm.Data.Collection',
                    instantiateOnAccept: true,
                    instantiator: {
                        __construct: 'Amm.Instantiator.Proto',
                        proto: {
                            class: 'Amm.Data.Model',
                            firstName: '',
                            lastName: '',
                            points: ''
                        },
                        overrideProto: true
                    },
                    
                    items: [
                        {
                            firstName: 'John',
                            lastName: 'Doe',
                            points: 10,
                        },
                        {
                            firstName: 'Jane',
                            lastName: 'James',
                            points: 12,
                        },
                        {
                            firstName: 'Jim',
                            lastName: 'Bloggs',
                            points: 9,
                        },
                        {
                            firstName: 'Samantha',
                            lastName: 'Moo',
                            points: 11,
                        }
                        
                    ]
                }
            }"
        >
        </div>
        
    </body>
</html>
