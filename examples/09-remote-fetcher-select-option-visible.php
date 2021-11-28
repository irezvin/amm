<?php
    $title = "Remote.Fetcher, Select.Option.visible";
    require(__DIR__.'/top.inc.php');
?> 
    <script type="text/javascript">
            window.cities = [
                "Киев", "Харьков", "Одесса", "Днепр", "Донецк", "Запорожье", "Львов", "Кривой Рог", "Николаев", "Севастополь", "Мариуполь", "Луганск", "Винница", "Макеевка", "Симферополь", "Херсон", "Полтава", "Чернигов", "Черкассы", "Хмельницкий", "Черновцы", "Житомир", "Сумы", "Ровно", "Горловка", "Ивано-Франковск", "Каменское", "Кропивницкий", "Тернополь", "Кременчуг", "Луцк", "Белая Церковь", "Краматорск", "Мелитополь", "Керчь", "Ужгород", "Славянск", "Никополь", "Бердянск", "Алчевск", "Евпатория", "Бровары", "Павлоград", "Северодонецк", "Каменец-Подольский", "Лисичанск", "Александрия", "Красный Луч", "Енакиево", "Стаханов",  "Константиновка"
            ];
    </script>
    </head>
    <body>
        <div data-amm-e="{id: par, extraTraits: [t.Component]}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: false}]">
            <div>
                <div style="clear: both">
                    <span style="color: gold; font-weight: bold; font-size: 20px; font-family: sans-serif; text-align: left" data-amm-id="clock" data-amm-e="{
                            prop__fetcher: {
                                __construct: Amm.Remote.Fetcher,
                                requestProducer: 'echo.php?time=1',
                                throttleDelay: 1000,
                                auto: 1
                            },
                            in__content: 'this.fetcher.response.time',
                            expr__poll: {
                                src: 'poll.value',
                                writeProperty: 'this.fetcher.poll',
                            },
                            expr__format: {
                                src: 'format.value === \'custom:\'? custom.value: format.value',
                                writeProperty: 'this.fetcher.requestProducer.uri::time',
                            }
                         }" data-amm-v="[v.Visual, v.Content]">
                    </span>
                    <label style="float: right" data-amm-id="custom" data-amm-e="{in__visible: 'format.value === \'custom:\''}" data-amm-v="[v.Visual]">
                        Custom format: 
                        <input type="text" data-amm-id="custom" data-amm-v="[{class: v.Input, updateOnKeyUp: true}]" />
                    </label>
                    <label style="float: right; margin-right: 1em">Format
                        <select data-amm-e="{id: format}" data-amm-v="[v.Visual, v.Select]">
                            <option value="1">default</option>
                            <option>d.m.Y</option>
                            <option>H:i</option>
                            <option>H:i:s</option>
                            <option>custom:</option>
                        </select>
                    </label>
                    <label style="float: right; min-width: 0; margin-right: 1em">Poll 
                        <input type="checkbox" data-amm-e="{id: poll}" data-amm-v="[v.Visual, v.Toggle]" />
                    </label>
                </div>
                <div style="max-width: 350px; float: left;">
                    <div><label>Local search:<br /><input type='text' name="search" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" data-amm-id="search" /></label></div>
                    <select size="26" data-amm-e="{multiple: true, 
                            sorter: {
                                criteria: ['selected desc', 'value asc']
                            },
                            optionPrototype: {
                                in__label: '(this.selected? \'✓ \' : \'\') + this.value', 
                                in__visible: '(this.selected || !search.value.length || this.value.indexOf(search.value) >= 0)'}, 
                                options: {$ext: cities}
                            }" data-amm-v="[v.Visual, v.Select]" data-amm-id="items">
                    </select>
                </div>
                <div style="max-width: 350px; float: left; margin-left: 10px">
                    <div><label>Remote Search:<br /><input type='text' name="search2" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" data-amm-id="search2" /></label></div>
                    <select size="26" data-amm-e="{multiple: true, 
                            prop__fetcher: {
                                __construct: Amm.Remote.Fetcher,
                                requestProducer: 'names.php',
                                auto: 2
                            },
                            expr__substring: {
                                'src': 'search2.value',
                                'writeProperty': 'this.fetcher.requestProducer.uri::q'
                            },
                            expr__selection: {
                                'src': 'this.value',
                                'writeProperty': 'this.fetcher.requestProducer.uri::v'
                            },
                            in__options: 'this.fetcher.response!!'
                        }" data-amm-v="[v.Visual, v.Select]" data-amm-id="items2">
                    </select>
                </div>
            </div>
        </div>
    </body>
</html>
