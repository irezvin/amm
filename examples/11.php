<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>11. TODO with fetcher-based saving &mdash; A.M.M. Example</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
        <link rel="stylesheet" type="text/css" href="example.css" />
        <link rel="stylesheet" type="text/css" href="todo.css" />
<?php 
        require_once(__DIR__.'/../build/list.php');
        foreach (listAmmFiles() as $f) { 
            echo "
        <script src=\"../js/classes/{$f}\"></script>";
        }
?> 
        
        <script type="text/javascript">
            Amm.getRoot().subscribe('bootstrap', function() {
                console.log("Amm bootstrapped");
            });
        </script>
        
    </head>
    <body>
        
        <h1>TODO list example</h1>
        <div class="cnt" data-amm-e="{
                extraTraits: t.Component, 
                id: cnt,
                prop__records: {
                    __construct: Amm.Remote.Fetcher,
                    firstDelay: 300,
                    throttleDelay: 500,
                    requestProducer: 'todo.php?action=list',
                    auto: true,
                },
                expr__filter: {
                    src: 'this->filter.value',
                    writeProperty: 'this.records.requestProducer.uri::filter'
                },
                expr__hidecompleted: {
                    src: 'this->hideCompleted.checked? \'false\' : null',
                    writeProperty: 'this.records.requestProducer.uri::completed'
                }
            }" data-amm-v="[v.StaticDisplayParent, v.Visual]">
            <div class="filters">
                <label>
                    <input type="text" placeholder="Search..." data-amm-id="filter"
                        data-amm-v="[v.Visual, {class: 'v.Input', updateOnKeyUp: true}]" />
                </label>
                <label>
                    Hide completed tasks: 
                    <input type="checkbox" data-amm-v="[v.Visual, v.Toggle]" data-amm-id="hideCompleted" />
                </label>
                <label 
                    data-amm-e="{in__visible: 'cnt.records.state === \'sent\' || cnt.records.state === \'started\''}" 
                    data-amm-v="[{class: v.Visual, delay: 0}]"
                >
                    Loading...
                </label>
            </div>
            <div data-amm-e="{
                extraTraits: [t.Repeater], 
                assocProperty: item,
                arrayMapperOptions: {
                    sort: {
                        criteria: ['this.completed ASC', 'this.priority ASC']
                    }
                },
                in__items: 'cnt.records.response!! || null'
            }" data-amm-v="[v.Visual]" data-amm-id="rpt">
                <div class="addTask">
                    <button onclick="
                        var e = Amm.findElement(this);
                        e.getComponent().g('rpt').getItems().unshift({priority: 0, task: '', completed: false});
                    ">Add Item</button>
                </div>
                <div data-amm-v="[v.DisplayParent]" data-amm-id="rpt">
                </div>
                <div style="display: none" data-amm-x="Amm.View.Html.Variants.build" data-amm-id="rpt">
                    <div data-amm-dont-build="" data-amm-default="" data-amm-e="{
                         className: 'item',
                         in__className__completed: this.item.completed,
                         prop__item: null,
                         extraTraits: t.Component,
                         id: itemContainer,
                         prop__editing: false,
                         prop__conn: {
                            __construct: Amm.Remote.Fetcher,
                            firstDelay: 50,
                            throttleDelay: 50,
                            requestProducer: {
                                'class': 'Amm.Remote.RequestProducer',
                                method: 'post',
                                uri: 'todo.php',
                            }
                         },
                         expr__editNewItems: {
                            src: !this.item.id,
                            writeProperty: this.editing,
                         },
                         expr__itemIdToConn: {
                            src: this.item.id,
                            writeProperty: 'this.conn.requestProducer.uri::id',
                         },
                         expr__itemToConn: {
                            src: this.item,
                            writeProperty: this.conn.requestProducer.data,
                         },
                         expr__responseToId: {
                            src: 'this.conn.response.record.id || this.item.id',
                            writeProperty: this.item.id,
                         }
                    }" 
                    data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]">
                        <div class="toggle cmpl">
                            <a title="Toggle Completed" href="" onclick="
                                var e = Amm.findElement(this); 
                                e.getItem().completed = !e.getItem().completed; 
                                e.getConn().getRequestProducer().setMethod('post');
                                e.getConn().run();
                                return false;
                            ">[C]</a>
                        </div>
                        <div title="Toggle Editing" class="toggle edit">
                            <a href="" onclick="var e = Amm.findElement(this); e.setEditing(!e.getEditing()); return false;">[E]</a>
                        </div>
                        <div title="Save" class="toggle save">
                            <a href="" onclick="
                                var e = Amm.findElement(this); 
                                e.getConn().getRequestProducer().setMethod(e.getItem().id? 'post' :  'put');
                                e.getConn().run();
                                e.setEditing(false);
                                return false;
                            ">[S]</a>
                        </div>
                        <div title="Delete" class="toggle delete">
                            <a href="" onclick="
                                try {
                                    var e = Amm.findElement(this);
                                    if (!confirm('Delete item \'' + e.getItem().task + '\'?')) return false;
                                    console.log(e.getConn());
                                    e.getConn().getRequestProducer().setMethod('delete');
                                    e.getConn().run();
                                    e.setVisible(false);
                                } catch(e) {
                                    console.log(e);
                                }
                                return false;">[D]</a>
                        </div>
                        <div class="view"
                             data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]"
                             data-amm-e="{extraTraits: 't.Component', in__visible: '!this.component.editing'}"
                        >
                            <div class="priority" data-amm-e="{in__content: 'component.component.item.priority'}" data-amm-v="[v.Visual, v.Content]"></div>
                            <div class="task" data-amm-e="{in__content: 'component.component.item.task'}" data-amm-v="[v.Visual, v.Content]"></div>
                        </div>
                        <div class="edit"
                             data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]"
                             data-amm-e="{extraTraits: 't.Component', in__visible: 'this.component.editing'}"
                        >
                            <div class="priority"><input type="text" data-amm-e="{sync__value: 'component.component.item.priority'}" data-amm-v="[v.Visual, v.Input]"></div>
                            <div class="task"><input type="text" data-amm-e="{sync__value: 'component.component.item.task'}" data-amm-v="[v.Visual, v.Input]"></div>
                        </div>
                    </div>>
                </div>
            </div>
        </div>
        
        
    </body>
</html>
