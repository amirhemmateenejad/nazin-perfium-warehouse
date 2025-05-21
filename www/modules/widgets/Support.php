<?php

namespace WHMCS\Module\Widget;

use WHMCS\Carbon;
use WHMCS\Module\AbstractWidget;

/**
 * Abstract Widget.
 *
 * @copyright Copyright (c) WHMCS Limited 2005-2018
 * @license https://www.whmcs.com/license/ WHMCS Eula
 */
class Support extends AbstractWidget
{
    protected $title = 'پشتیبانی';
    protected $description = 'بررسی سیستم پشتیبانی در یک نگاه';
    protected $weight = 30;
    protected $cache = true;
    protected $cacheExpiry = 120;
    protected $cachePerUser = true;
    protected $requiredPermission = 'List Support Tickets';

    public function getData()
    {
        $counts = localApi('GetTicketCounts', array());

        $tickets = localApi('GetTickets', array('status' => 'Awaiting Reply', 'limitstart' => '0', 'limitnum' => '5'));

        return array(
            'tickets' => array(
                'counts' => $counts,
                'recent' => (isset($tickets['tickets']['ticket'])) ? $tickets['tickets']['ticket'] : [],
            ),
        );
    }

    public function generateOutput($data)
    {
        $ticketsAwaitingReply = $data['tickets']['counts']['awaitingReply'];
        $ticketsAssigned = $data['tickets']['counts']['flaggedTickets'];

        $recentTickets = '';
        foreach ($data['tickets']['recent'] as $ticket) {
            $recentTickets .= '<div class="ticket">
        <div class="pull-right color-blue">' . Carbon::createFromFormat('Y-m-d H:i:s', $ticket['lastreply'])->diffForHumans() . '</div>
        <a href="supporttickets.php?action=view&id=' . $ticket['id'] . '">#' . $ticket['tid'] . ' - ' . $ticket['subject'] . '</a>
    </div>';
        }

        return <<<EOF
<div class="icon-stats">
    <div class="row">
        <div class="col-sm-6">
            <div class="item">
                <div class="icon-holder text-center color-blue">
                    <a href="supporttickets.php">
                        <i class="pe-7s-ticket"></i>
                    </a>
                </div>
                <div class="data">
                    <div class="note">
                        <a href="supporttickets.php">در انتظار پاسخ</a>
                    </div>
                    <div class="number">
                        <a href="supporttickets.php">
                            <span class="color-blue">{$ticketsAwaitingReply}</span>
                            <span class="unit">تیکت</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="item">
                <div class="icon-holder text-center color-pink">
                    <a href="supporttickets.php?view=flagged">
                        <i class="pe-7s-flag"></i>
                    </a>
                </div>
                <div class="data">
                    <div class="note">
                        <a href="supporttickets.php?view=flagged">برای شما</a>
                    </div>
                    <div class="number">
                        <a href="supporttickets.php?view=flagged">
                            <span class="color-pink">{$ticketsAssigned}</span>
                            <span class="unit">تیکت</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="tickets-list">
    {$recentTickets}
</div>

<div class="footer">
    <a href="supporttickets.php">مشاهده همه تیکت ها</a>
    <a href="supporttickets.php?view=flagged">مشاهده تیکت های من</a>
    <a href="supporttickets.php?action=open">ایجاد تیکت جدید</a>
</div>

EOF;
    }
}
